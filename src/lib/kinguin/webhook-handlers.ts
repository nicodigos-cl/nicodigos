import "server-only";

import {
  DeliveryMethod,
  DeliveryStatus,
} from "@/generated/prisma/client";
import {
  isFulfillmentManualReviewError,
  reconcileDelivery,
  recordFulfillmentFailure,
} from "@/lib/deliveries/fulfillment";
import { syncKinguinProductById } from "@/lib/kinguin/sync";
import type {
  KinguinWebhookOrderStatusInput,
  KinguinWebhookProductUpdateInput,
} from "@/lib/kinguin/webhook";
import { createLogger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { enqueueDeliveryEmail } from "@/lib/queues/delivery";

const log = createLogger({ module: "kinguin-webhook" });

function parseWebhookUpdatedAt(updatedAt: string | undefined): Date | null {
  if (!updatedAt) return null;
  const ts = Date.parse(updatedAt);
  if (!Number.isFinite(ts)) return null;
  return new Date(ts);
}

/** Skip when webhook `updatedAt` is older than our last sync (docs recommendation). */
function isStaleWebhook(
  updatedAt: string | undefined,
  lastSyncedAt: Date | null,
): boolean {
  const webhookAt = parseWebhookUpdatedAt(updatedAt);
  if (!webhookAt || !lastSyncedAt) return false;
  return webhookAt.getTime() < lastSyncedAt.getTime();
}

async function findKinguinDelivery(payload: KinguinWebhookOrderStatusInput) {
  const orderId = payload.orderId;
  const orderExternalId = payload.orderExternalId;

  return prisma.delivery.findFirst({
    where: {
      deliveryMethod: DeliveryMethod.KINGUIN,
      OR: [
        { kinguinOrderId: orderId },
        { externalOrderId: orderId },
        ...(orderExternalId
          ? [{ orderExternalId }, { id: orderExternalId }]
          : []),
      ],
    },
    select: {
      id: true,
      status: true,
      externalStatus: true,
      lastSyncedAt: true,
      orderItem: { select: { orderId: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function handleKinguinOrderStatusWebhook(
  payload: KinguinWebhookOrderStatusInput,
): Promise<void> {
  const delivery = await findKinguinDelivery(payload);
  if (!delivery) {
    log.warn(
      {
        orderId: payload.orderId,
        orderExternalId: payload.orderExternalId ?? null,
        status: payload.status ?? null,
      },
      "Kinguin order webhook: delivery not found",
    );
    return;
  }

  if (isStaleWebhook(payload.updatedAt, delivery.lastSyncedAt)) {
    log.info(
      {
        deliveryId: delivery.id,
        orderId: payload.orderId,
        updatedAt: payload.updatedAt,
        lastSyncedAt: delivery.lastSyncedAt?.toISOString() ?? null,
      },
      "Kinguin order webhook: stale updatedAt, skipping",
    );
    return;
  }

  if (
    delivery.status === DeliveryStatus.DELIVERED ||
    delivery.status === DeliveryStatus.CANCELED
  ) {
    return;
  }

  const remoteStatus = String(payload.status ?? "").toLowerCase();

  if (["canceled", "cancelled", "refunded"].includes(remoteStatus)) {
    await recordFulfillmentFailure(
      delivery.id,
      new Error(`Kinguin webhook: orden ${remoteStatus}`),
      true,
    );
    await enqueueDeliveryEmail({
      deliveryId: delivery.id,
      type: "FAILED",
    }).catch((error) => {
      log.warn(
        { err: error, deliveryId: delivery.id },
        "Failed to enqueue FAILED email after Kinguin cancel/refund webhook",
      );
    });
    return;
  }

  if (remoteStatus === "completed" || remoteStatus === "processing") {
    try {
      const result = await reconcileDelivery(delivery.id);
      if (result.status === DeliveryStatus.DELIVERED) {
        await enqueueDeliveryEmail({
          deliveryId: result.deliveryId,
          type: "COMPLETED",
        }).catch((error) => {
          log.warn(
            { err: error, deliveryId: result.deliveryId },
            "Failed to enqueue COMPLETED email after Kinguin webhook",
          );
        });
      }
      log.info(
        {
          deliveryId: delivery.id,
          orderId: payload.orderId,
          remoteStatus,
          status: result.status,
        },
        "Kinguin order webhook reconciled",
      );
    } catch (error) {
      if (isFulfillmentManualReviewError(error)) {
        await recordFulfillmentFailure(delivery.id, error, true);
        await enqueueDeliveryEmail({
          deliveryId: delivery.id,
          type: "FAILED",
        }).catch(() => undefined);
        return;
      }
      throw error;
    }
    return;
  }

  if (payload.status && payload.status !== delivery.externalStatus) {
    await prisma.delivery.update({
      where: { id: delivery.id },
      data: {
        externalStatus: payload.status,
        lastSyncedAt: new Date(),
      },
    });
  }
}

export async function handleKinguinProductUpdateWebhook(
  payload: KinguinWebhookProductUpdateInput,
): Promise<void> {
  const product =
    (await prisma.product.findFirst({
      where: {
        deliveryMethod: DeliveryMethod.KINGUIN,
        kinguinId: payload.kinguinId,
      },
      select: { id: true, kinguinSyncedAt: true },
    })) ??
    (await prisma.product.findFirst({
      where: {
        deliveryMethod: DeliveryMethod.KINGUIN,
        kinguinProductId: payload.productId,
      },
      select: { id: true, kinguinSyncedAt: true },
    }));

  if (!product) {
    log.info(
      { kinguinId: payload.kinguinId, productId: payload.productId },
      "Kinguin product.update: product not imported locally",
    );
    return;
  }

  if (isStaleWebhook(payload.updatedAt, product.kinguinSyncedAt)) {
    log.info(
      {
        productId: product.id,
        kinguinId: payload.kinguinId,
        updatedAt: payload.updatedAt,
        kinguinSyncedAt: product.kinguinSyncedAt?.toISOString() ?? null,
      },
      "Kinguin product.update: stale updatedAt, skipping",
    );
    return;
  }

  const result = await syncKinguinProductById(product.id);
  log.info(
    {
      productId: product.id,
      kinguinId: payload.kinguinId,
      status: result.status,
      repriced: result.repriced,
      offersUpserted: result.offersUpserted,
    },
    "Kinguin product.update synced",
  );
}
