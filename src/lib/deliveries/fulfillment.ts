import "server-only";

import {
  DeliveryContentType,
  DeliveryEventSource,
  DeliveryMethod,
  DeliveryStatus,
  ProductKeyStatus,
  type Prisma,
} from "@/generated/prisma/client";
import { sendAdminManualReviewEmail } from "@/lib/deliveries/admin-manual-review-email";
import { recalculateOrderStatus } from "@/lib/deliveries/order-status";
import { KinguinClient } from "@/lib/kinguin-client";
import { createLogger } from "@/lib/logger";
import { MANUAL_REVIEW_CUSTOMER_MESSAGE } from "@/lib/order-live/events";
import { publishOrderLiveStatus } from "@/lib/order-live/publish";
import prisma from "@/lib/prisma";
import {
  refreshBalancesAfterInsufficientFunds,
  refreshBalancesAfterPurchase,
} from "@/lib/providers/balance";
import { getOperationalSettings } from "@/lib/settings/runtime";
import { SmmApiError, SmmService } from "@/lib/smm-service";
import type { SmmOrderPayload } from "@/types/smm";

const log = createLogger({ module: "delivery-fulfillment" });

export class FulfillmentManualReviewError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FulfillmentManualReviewError";
  }
}

export type FulfillmentResult = {
  deliveryId: string;
  orderId: string;
  status: DeliveryStatus;
};

async function appendSystemEvent(
  tx: Prisma.TransactionClient,
  deliveryId: string,
  status: DeliveryStatus,
  message: string,
) {
  await tx.deliveryEvent.create({
    data: {
      deliveryId,
      status,
      message: message.slice(0, 2_000),
      source: DeliveryEventSource.SYSTEM,
    },
  });
}

async function fulfillManual(deliveryId: string): Promise<FulfillmentResult> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${deliveryId}))`;
    const delivery = await tx.delivery.findUniqueOrThrow({
      where: { id: deliveryId },
      select: {
        id: true,
        status: true,
        orderItem: {
          select: { id: true, orderId: true, productId: true, quantity: true },
        },
        _count: { select: { keys: true, credentials: true } },
      },
    });
    if (delivery.status === DeliveryStatus.DELIVERED) {
      return { deliveryId, orderId: delivery.orderItem.orderId, status: delivery.status };
    }
    if (delivery._count.keys + delivery._count.credentials > 0) {
      throw new FulfillmentManualReviewError(
        "La entrega manual ya contiene material preparado y requiere revisión antes de completarse.",
      );
    }

    const keys = await tx.productKey.findMany({
      where: {
        productId: delivery.orderItem.productId,
        status: ProductKeyStatus.AVAILABLE,
      },
      orderBy: { createdAt: "asc" },
      take: delivery.orderItem.quantity,
      select: { id: true, code: true },
    });
    if (keys.length !== delivery.orderItem.quantity) {
      throw new FulfillmentManualReviewError(
        `Inventario insuficiente: se requieren ${delivery.orderItem.quantity} keys y hay ${keys.length}.`,
      );
    }

    for (const key of keys) {
      const claimed = await tx.productKey.updateMany({
        where: { id: key.id, status: ProductKeyStatus.AVAILABLE },
        data: { status: ProductKeyStatus.SOLD, orderItemId: delivery.orderItem.id },
      });
      if (claimed.count !== 1) {
        throw new Error("Una key fue asignada por otro proceso; el job se reintentar?.");
      }
      await tx.deliveryKey.create({
        data: {
          deliveryId,
          serial: key.code,
          contentType: DeliveryContentType.PRODUCT_KEY,
          label: "Product key",
          isSecret: true,
          productKeyId: key.id,
        },
      });
    }

    await tx.delivery.update({
      where: { id: deliveryId },
      data: {
        status: DeliveryStatus.DELIVERED,
        deliveredAt: new Date(),
        processingStartedAt: new Date(),
        failedAt: null,
        errorMessage: null,
        lastError: null,
        attemptCount: { increment: 1 },
      },
    });
    await appendSystemEvent(tx, deliveryId, DeliveryStatus.DELIVERED, "Keys asignadas automáticamente");
    await recalculateOrderStatus(tx, delivery.orderItem.orderId);
    return { deliveryId, orderId: delivery.orderItem.orderId, status: DeliveryStatus.DELIVERED };
  }).then(async (result) => {
    await publishOrderLiveStatus(result.orderId);
    return result;
  });
}

async function resolveSmmClient(productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { smmApiUrl: true, smmServiceId: true },
  });
  if (!product?.smmApiUrl || product.smmServiceId == null) {
    throw new FulfillmentManualReviewError("El producto no tiene servicio SMM configurado.");
  }
  const provider = await prisma.smmProvider.findFirst({
    where: { apiUrl: product.smmApiUrl, status: "ACTIVE" },
    select: { apiUrl: true, apiKey: true },
  });
  if (!provider) {
    throw new FulfillmentManualReviewError("No hay un provider SMM activo para el producto.");
  }
  return {
    client: new SmmService({ apiUrl: provider.apiUrl, apiKey: provider.apiKey }),
    remoteServiceId: product.smmServiceId,
  };
}

async function fulfillSmm(deliveryId: string): Promise<FulfillmentResult> {
  const delivery = await prisma.delivery.findUniqueOrThrow({
    where: { id: deliveryId },
    select: {
      id: true,
      status: true,
      externalOrderId: true,
      orderItem: {
        select: { productId: true, orderId: true, quantity: true, smm: true },
      },
    },
  });
  if (delivery.externalOrderId) {
    return { deliveryId, orderId: delivery.orderItem.orderId, status: delivery.status };
  }
  if (!delivery.orderItem.smm?.link && !delivery.orderItem.smm?.username) {
    throw new FulfillmentManualReviewError(
      "Faltan los datos de destino del pedido SMM.",
    );
  }

  const claimed = await prisma.delivery.updateMany({
    where: {
      id: deliveryId,
      externalOrderId: null,
      status: {
        in: [DeliveryStatus.PENDING, DeliveryStatus.QUEUED, DeliveryStatus.FAILED, DeliveryStatus.PROCESSING],
      },
    },
    data: {
      status: DeliveryStatus.PROCESSING,
      processingStartedAt: new Date(),
      failedAt: null,
      attemptCount: { increment: 1 },
    },
  });
  if (claimed.count !== 1) {
    throw new FulfillmentManualReviewError("La entrega SMM no está disponible para fulfillment automático.");
  }

  const { client, remoteServiceId } = await resolveSmmClient(delivery.orderItem.productId);
  const smm = delivery.orderItem.smm;
  const payload = {
    service: remoteServiceId,
    ...(smm.link ? { link: smm.link } : {}),
    ...(smm.quantity != null || delivery.orderItem.quantity
      ? { quantity: smm.quantity ?? delivery.orderItem.quantity }
      : {}),
    ...(smm.comments ? { comments: smm.comments } : {}),
    ...(smm.runs != null ? { runs: smm.runs } : {}),
    ...(smm.intervalMinutes != null ? { interval: smm.intervalMinutes } : {}),
    ...(smm.username ? { username: smm.username } : {}),
    ...(smm.usernames ? { usernames: smm.usernames } : {}),
    ...(smm.hashtags ? { hashtags: smm.hashtags } : {}),
    ...(smm.mediaUrl ? { media: smm.mediaUrl } : {}),
    ...(smm.min != null ? { min: smm.min } : {}),
    ...(smm.max != null ? { max: smm.max } : {}),
    ...(smm.delayMinutes != null ? { delay: smm.delayMinutes } : {}),
    ...(smm.posts != null ? { posts: smm.posts } : {}),
    ...(smm.oldPosts != null ? { old_posts: smm.oldPosts } : {}),
    ...(smm.expiry ? { expiry: smm.expiry } : {}),
    ...(smm.answerNumber ? { answer_number: smm.answerNumber } : {}),
  } as SmmOrderPayload;

  try {
    const response = await client.order(payload);
    const remoteId = String(response.order);
    await prisma.$transaction(async (tx) => {
      await tx.delivery.update({
        where: { id: deliveryId },
        data: {
          externalOrderId: remoteId,
          externalStatus: "Pending",
          status: DeliveryStatus.PROCESSING,
          errorMessage: null,
          lastError: null,
          lastSyncedAt: new Date(),
        },
      });
      await appendSystemEvent(tx, deliveryId, DeliveryStatus.PROCESSING, `Pedido enviado al panel SMM (#${remoteId})`);
      await recalculateOrderStatus(tx, delivery.orderItem.orderId);
    });

    const product = await prisma.product.findUnique({
      where: { id: delivery.orderItem.productId },
      select: { smmApiUrl: true },
    });
    const provider = product?.smmApiUrl
      ? await prisma.smmProvider.findFirst({
          where: { apiUrl: product.smmApiUrl, status: "ACTIVE" },
          select: { id: true },
        })
      : null;
    await Promise.all([
      refreshBalancesAfterPurchase({
        provider: "SMM",
        accountId: provider?.id,
      }),
      publishOrderLiveStatus(delivery.orderItem.orderId),
    ]);
    return { deliveryId, orderId: delivery.orderItem.orderId, status: DeliveryStatus.PROCESSING };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/insufficient|not enough|low balance|no funds|fondos/i.test(message)) {
      const product = await prisma.product.findUnique({
        where: { id: delivery.orderItem.productId },
        select: { smmApiUrl: true },
      });
      const provider = product?.smmApiUrl
        ? await prisma.smmProvider.findFirst({
            where: { apiUrl: product.smmApiUrl, status: "ACTIVE" },
            select: { id: true },
          })
        : null;
      await refreshBalancesAfterInsufficientFunds({
        provider: "SMM",
        accountId: provider?.id,
        message,
      });
    }
    if (error instanceof SmmApiError && (!error.status || (error.status >= 200 && error.status < 500 && error.status !== 429))) {
      throw new FulfillmentManualReviewError(
        error.status ? error.message : `Resultado SMM incierto; conciliar antes de repetir. ${error.message}`,
      );
    }
    throw error;
  }
}

async function persistKinguinOrder(deliveryId: string, orderId: string, order: Awaited<ReturnType<KinguinClient["placeOrderV1"]>>) {
  const remoteId = order.orderId || order.kinguinOrderId || "";
  if (!remoteId) throw new Error("Kinguin no devolvi? un identificador de orden.");
  await prisma.$transaction(async (tx) => {
    await tx.delivery.update({
      where: { id: deliveryId },
      data: {
        kinguinOrderId: order.kinguinOrderId ?? remoteId,
        externalOrderId: remoteId,
        orderExternalId: order.orderExternalId ?? deliveryId,
        externalStatus: String(order.status),
        requestPriceEur: order.requestTotalPrice != null
          ? String(order.requestTotalPrice)
          : order.totalPrice != null
            ? String(order.totalPrice)
            : undefined,
        status: DeliveryStatus.PROCESSING,
        errorMessage: null,
        lastError: null,
        lastSyncedAt: new Date(),
      },
    });
    await appendSystemEvent(tx, deliveryId, DeliveryStatus.PROCESSING, `Fulfillment Kinguin solicitado (#${remoteId})`);
    await recalculateOrderStatus(tx, orderId);
  });
}

async function fulfillKinguin(deliveryId: string): Promise<FulfillmentResult> {
  const delivery = await prisma.delivery.findUniqueOrThrow({
    where: { id: deliveryId },
    select: {
      status: true,
      kinguinOrderId: true,
      externalOrderId: true,
      orderExternalId: true,
      orderItem: {
        select: {
          quantity: true,
          unitPrice: true,
          orderId: true,
          product: { select: { kinguinId: true, kinguinOfferId: true, sourceCostPrice: true } },
        },
      },
    },
  });
  if (delivery.kinguinOrderId || delivery.externalOrderId) {
    return { deliveryId, orderId: delivery.orderItem.orderId, status: delivery.status };
  }
  if (delivery.orderItem.product.kinguinId == null) {
    throw new FulfillmentManualReviewError("El producto no tiene kinguinId configurado.");
  }

  const orderExternalId = delivery.orderExternalId || deliveryId;
  const client = new KinguinClient();
  const existing = await client.searchOrders({ orderExternalId, limit: 1 });
  if (existing.results[0]) {
    await persistKinguinOrder(deliveryId, delivery.orderItem.orderId, existing.results[0]);
    return { deliveryId, orderId: delivery.orderItem.orderId, status: DeliveryStatus.PROCESSING };
  }

  const claimed = await prisma.delivery.updateMany({
    where: {
      id: deliveryId,
      kinguinOrderId: null,
      externalOrderId: null,
      status: {
        in: [DeliveryStatus.PENDING, DeliveryStatus.QUEUED, DeliveryStatus.FAILED, DeliveryStatus.PROCESSING],
      },
    },
    data: {
      status: DeliveryStatus.PROCESSING,
      orderExternalId,
      processingStartedAt: new Date(),
      failedAt: null,
      attemptCount: { increment: 1 },
    },
  });
  if (claimed.count !== 1) {
    throw new FulfillmentManualReviewError("La entrega Kinguin no está disponible para fulfillment automático.");
  }

  const price = Number.parseFloat(
    (delivery.orderItem.product.sourceCostPrice ?? delivery.orderItem.unitPrice).toString(),
  );
  try {
    const order = await client.placeOrderV1({
      orderExternalId,
      products: [{
        kinguinId: delivery.orderItem.product.kinguinId,
        qty: delivery.orderItem.quantity,
        price,
        offerId: delivery.orderItem.product.kinguinOfferId ?? undefined,
      }],
    });
    await persistKinguinOrder(deliveryId, delivery.orderItem.orderId, order);
    await Promise.all([
      refreshBalancesAfterPurchase({ provider: "KINGUIN" }),
      publishOrderLiveStatus(delivery.orderItem.orderId),
    ]);
    return { deliveryId, orderId: delivery.orderItem.orderId, status: DeliveryStatus.PROCESSING };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/insufficient|not enough|low balance|no funds|fondos|credit/i.test(message)) {
      await refreshBalancesAfterInsufficientFunds({
        provider: "KINGUIN",
        message,
      });
    }
    throw error;
  }
}

export async function fulfillDelivery(deliveryId: string): Promise<FulfillmentResult> {
  const delivery = await prisma.delivery.findUnique({
    where: { id: deliveryId },
    select: {
      deliveryMethod: true,
      effectiveDeliveryMethod: true,
      status: true,
      orderItem: {
        select: {
          orderId: true,
          order: {
            select: {
              status: true,
              payments: { where: { status: "PAID" }, take: 1, select: { id: true } },
            },
          },
        },
      },
    },
  });
  if (!delivery) throw new FulfillmentManualReviewError("La entrega no existe.");
  if (delivery.status === DeliveryStatus.DELIVERED || delivery.status === DeliveryStatus.CANCELED) {
    return { deliveryId, orderId: delivery.orderItem.orderId, status: delivery.status };
  }
  const paidOrderStatuses = ["PAID", "PROCESSING", "FULFILLED", "PARTIALLY_FULFILLED"];
  if (
    !paidOrderStatuses.includes(delivery.orderItem.order.status) &&
    delivery.orderItem.order.payments.length === 0
  ) {
    throw new FulfillmentManualReviewError("El pedido no tiene un pago confirmado.");
  }

  const method = delivery.effectiveDeliveryMethod ?? delivery.deliveryMethod;
  log.info({ deliveryId, method, historicalMethod: delivery.deliveryMethod }, "Starting delivery fulfillment");
  if (method === DeliveryMethod.MANUAL) return fulfillManual(deliveryId);
  if (method === DeliveryMethod.SMM) return fulfillSmm(deliveryId);
  return fulfillKinguin(deliveryId);
}

async function reconcileSmm(deliveryId: string): Promise<FulfillmentResult> {
  const delivery = await prisma.delivery.findUniqueOrThrow({
    where: { id: deliveryId },
    select: {
      status: true,
      externalOrderId: true,
      externalStatus: true,
      orderItem: { select: { productId: true, orderId: true } },
    },
  });
  if (!delivery.externalOrderId) {
    throw new FulfillmentManualReviewError("La entrega SMM no tiene referencia remota para conciliar.");
  }
  const [{ client }, settings] = await Promise.all([
    resolveSmmClient(delivery.orderItem.productId),
    getOperationalSettings(),
  ]);
  const remote = await client.status(delivery.externalOrderId);
  const remoteStatus = String(remote.status);
  const normalized = remoteStatus.toLowerCase();
  const completed = normalized === "completed" || (normalized === "partial" && settings.smmAllowPartials);
  if (["canceled", "cancelled", "error"].some((value) => normalized.includes(value))) {
    throw new FulfillmentManualReviewError(`El panel SMM informó estado ${remoteStatus}.`);
  }
  const nextStatus = completed ? DeliveryStatus.DELIVERED : DeliveryStatus.PROCESSING;

  await prisma.$transaction(async (tx) => {
    await tx.delivery.update({
      where: { id: deliveryId },
      data: {
        externalStatus: remoteStatus,
        smmCharge: remote.charge != null ? String(remote.charge) : undefined,
        smmCurrency: remote.currency ?? undefined,
        smmStartCount: remote.start_count != null ? Number(remote.start_count) : undefined,
        smmRemains: remote.remains != null ? Number(remote.remains) : undefined,
        lastSyncedAt: new Date(),
        status: nextStatus,
        deliveredAt: completed ? new Date() : undefined,
        errorMessage: null,
        lastError: null,
      },
    });
    if (delivery.externalStatus !== remoteStatus || delivery.status !== nextStatus) {
      await appendSystemEvent(tx, deliveryId, nextStatus, `Conciliado SMM: ${remoteStatus}`);
    }
    await recalculateOrderStatus(tx, delivery.orderItem.orderId);
  });
  await publishOrderLiveStatus(delivery.orderItem.orderId);
  return { deliveryId, orderId: delivery.orderItem.orderId, status: nextStatus };
}

async function reconcileKinguin(deliveryId: string): Promise<FulfillmentResult> {
  const delivery = await prisma.delivery.findUniqueOrThrow({
    where: { id: deliveryId },
    select: {
      status: true,
      externalOrderId: true,
      kinguinOrderId: true,
      externalStatus: true,
      orderItem: { select: { orderId: true } },
    },
  });
  const remoteOrderId = delivery.kinguinOrderId || delivery.externalOrderId;
  if (!remoteOrderId) {
    throw new FulfillmentManualReviewError("La entrega Kinguin no tiene referencia remota para conciliar.");
  }
  const client = new KinguinClient();
  const order = await client.getOrder(remoteOrderId);
  const remoteStatus = String(order.status);
  const normalized = remoteStatus.toLowerCase();
  if (["canceled", "cancelled", "refunded"].includes(normalized)) {
    throw new FulfillmentManualReviewError(`Kinguin informó estado ${remoteStatus}.`);
  }
  const completed = normalized === "completed";
  const keys = completed ? await client.downloadKeys(remoteOrderId) : [];
  const nextStatus = completed ? DeliveryStatus.DELIVERED : DeliveryStatus.PROCESSING;
  let imported = 0;

  await prisma.$transaction(async (tx) => {
    for (const key of keys) {
      const existing = await tx.deliveryKey.findFirst({
        where: {
          OR: [
            { externalKeyId: key.id },
            { deliveryId, serial: key.serial },
          ],
        },
        select: { id: true },
      });
      if (existing) continue;
      await tx.deliveryKey.create({
        data: {
          deliveryId,
          serial: key.serial,
          type: key.type,
          contentType: DeliveryContentType.PRODUCT_KEY,
          externalKeyId: key.id,
          label: key.name ?? "Kinguin key",
          isSecret: true,
        },
      });
      imported += 1;
    }
    await tx.delivery.update({
      where: { id: deliveryId },
      data: {
        externalStatus: remoteStatus,
        status: nextStatus,
        deliveredAt: completed ? new Date() : undefined,
        lastSyncedAt: new Date(),
        errorMessage: null,
        lastError: null,
        requestPriceEur: order.requestTotalPrice != null
          ? String(order.requestTotalPrice)
          : undefined,
      },
    });
    if (delivery.externalStatus !== remoteStatus || delivery.status !== nextStatus || imported > 0) {
      await appendSystemEvent(
        tx,
        deliveryId,
        nextStatus,
        `Conciliado Kinguin: ${remoteStatus}${imported ? ` ? +${imported} keys` : ""}`,
      );
    }
    await recalculateOrderStatus(tx, delivery.orderItem.orderId);
  });
  await publishOrderLiveStatus(delivery.orderItem.orderId);
  return { deliveryId, orderId: delivery.orderItem.orderId, status: nextStatus };
}

export async function reconcileDelivery(deliveryId: string): Promise<FulfillmentResult> {
  const delivery = await prisma.delivery.findUniqueOrThrow({
    where: { id: deliveryId },
    select: {
      deliveryMethod: true,
      effectiveDeliveryMethod: true,
      status: true,
      orderItem: { select: { orderId: true } },
    },
  });
  if (delivery.status === DeliveryStatus.DELIVERED || delivery.status === DeliveryStatus.CANCELED) {
    return { deliveryId, orderId: delivery.orderItem.orderId, status: delivery.status };
  }
  const method = delivery.effectiveDeliveryMethod ?? delivery.deliveryMethod;
  if (method === DeliveryMethod.SMM) return reconcileSmm(deliveryId);
  if (method === DeliveryMethod.KINGUIN) return reconcileKinguin(deliveryId);
  throw new FulfillmentManualReviewError("Una entrega MANUAL no requiere conciliación remota.");
}

export async function recordFulfillmentFailure(
  deliveryId: string,
  error: unknown,
  manualReview: boolean,
) {
  const message = error instanceof Error ? error.message : "Error desconocido de fulfillment";
  let orderId: string | null = null;

  await prisma.$transaction(async (tx) => {
    const delivery = await tx.delivery.findUnique({
      where: { id: deliveryId },
      select: {
        status: true,
        deliveryMethod: true,
        orderItem: { select: { orderId: true } },
      },
    });
    if (!delivery || delivery.status === DeliveryStatus.DELIVERED || delivery.status === DeliveryStatus.CANCELED) {
      return;
    }
    orderId = delivery.orderItem.orderId;
    const status = manualReview ? DeliveryStatus.MANUAL_REVIEW : DeliveryStatus.FAILED;
    const switchToManual =
      manualReview &&
      (delivery.deliveryMethod === DeliveryMethod.SMM ||
        delivery.deliveryMethod === DeliveryMethod.KINGUIN);

    await tx.delivery.update({
      where: { id: deliveryId },
      data: {
        status,
        errorMessage: message.slice(0, 2_000),
        lastError: message.slice(0, 2_000),
        failedAt: new Date(),
        ...(switchToManual
          ? {
              effectiveDeliveryMethod: DeliveryMethod.MANUAL,
              customerMessage: MANUAL_REVIEW_CUSTOMER_MESSAGE,
            }
          : {}),
      },
    });
    await appendSystemEvent(
      tx,
      deliveryId,
      status,
      manualReview
        ? `Requiere revisión manual: ${message}`
        : `Intento de fulfillment fallido: ${message}`,
    );
    await recalculateOrderStatus(tx, delivery.orderItem.orderId);
  });

  if (!orderId) return;

  // Side effects after PostgreSQL commit: notify in parallel, never block each other.
  const tasks: Array<Promise<unknown>> = [publishOrderLiveStatus(orderId)];
  if (manualReview) {
    tasks.push(sendAdminManualReviewEmail(deliveryId));
  }
  await Promise.allSettled(tasks);
}
