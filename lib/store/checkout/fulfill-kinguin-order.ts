import { revalidatePath } from "next/cache";

import { formatKinguinError } from "@/lib/kinguin/errors";
import { getKinguinSdk, isKinguinConfigured } from "@/lib/kinguin/client";
import { findKinguinOrderByExternalId } from "@/lib/store/checkout/find-kinguin-order";
import {
  buildKinguinPlaceOrderProducts,
  placeKinguinOrderWithFallback,
} from "@/lib/store/checkout/kinguin-place-order";
import prisma from "@/lib/prisma";
import type { KinguinKey, KinguinOrder } from "@/types/kinguin";
import { storeRoutes } from "@/lib/store/navigation";
import { syncTransactionsForOrder } from "@/lib/transactions/on-order";
import { getKinguinBalanceCached, updateKinguinBalanceCached } from "@/lib/kinguin/balance";

export type FulfillKinguinOrderResult = {
  status: "completed" | "processing" | "failed" | "skipped";
  message: string;
  keysDelivered: number;
  kinguinOrderId?: string;
};

const KINGUIN_PLACING_PREFIX = "kinguin:placing:";
const KINGUIN_PLACED_PREFIX = "kinguin:placed:";
const KINGUIN_ERROR_PREFIX = "error:";
/** Tras este tiempo se libera el lock y se puede reintentar (Kinguin-eCommerce-API: pedido puede quedar en `processing`). */
const PLACING_STALE_MS = 45 * 1000;

function cachedFulfillmentError(kinguinStatus: string | null): string | null {
  if (!kinguinStatus?.startsWith(KINGUIN_ERROR_PREFIX)) {
    return null;
  }
  const message = kinguinStatus.slice(KINGUIN_ERROR_PREFIX.length).trim();
  return message.length > 0 ? message : null;
}

async function clearStalePlacingLock(orderId: string): Promise<void> {
  await prisma.order.updateMany({
    where: {
      id: orderId,
      kinguinOrderId: null,
      kinguinStatus: { startsWith: KINGUIN_PLACING_PREFIX },
    },
    data: { kinguinStatus: null },
  });
}

function findOrderItemForKey(
  items: Array<{
    id: string;
    kinguinOfferId: string;
    kinguinProductId: string;
    kinguinId: number;
  }>,
  key: KinguinKey,
) {
  return (
    items.find((item) => item.kinguinOfferId === key.offerId) ??
    items.find((item) => item.kinguinProductId === key.productId) ??
    items.find((item) => item.kinguinId === key.kinguinId)
  );
}

async function countDeliveredKeys(orderId: string): Promise<number> {
  return prisma.orderKey.count({
    where: {
      orderItem: { orderId },
      status: "DELIVERED",
      serial: { not: "" },
    },
  });
}

function isPlacingStatus(status: string | null): boolean {
  return status?.startsWith(KINGUIN_PLACING_PREFIX) ?? false;
}

function placingTimestamp(status: string | null): number | null {
  if (!status || !isPlacingStatus(status)) return null;
  const raw = status.slice(KINGUIN_PLACING_PREFIX.length);
  const ts = Number(raw);
  return Number.isFinite(ts) ? ts : null;
}

async function persistKinguinKeys(
  orderId: string,
  items: Array<{
    id: string;
    kinguinOfferId: string;
    kinguinProductId: string;
    kinguinId: number;
  }>,
  keys: KinguinKey[],
): Promise<number> {
  let delivered = 0;

  for (const key of keys) {
    const item = findOrderItemForKey(items, key);
    if (!item) continue;

    await prisma.orderKey.upsert({
      where: { kinguinKeyId: key.id },
      create: {
        orderItemId: item.id,
        kinguinKeyId: key.id,
        serial: key.serial,
        contentType: key.type,
        status: "DELIVERED",
      },
      update: {
        serial: key.serial,
        contentType: key.type,
        status: "DELIVERED",
      },
    });

    delivered += 1;
  }

  if (delivered > 0) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        userId: true,
        status: true,
        total: true,
        currency: true,
        kinguinOrderId: true,
        isPreorder: true,
        updatedAt: true,
      },
    });

    if (order && order.status === "PROCESSING" && !order.isPreorder) {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: "COMPLETED" },
      });

      await syncTransactionsForOrder({
        ...order,
        status: "COMPLETED",
      });
    }
  }

  revalidatePath(storeRoutes.orders);
  revalidatePath("/dashboard/orders");

  return delivered;
}

async function syncKinguinOrderToDb(
  orderId: string,
  kinguinOrder: KinguinOrder,
  isPreorder: boolean,
  preorderReleaseAt: Date | null,
) {
  await prisma.order.update({
    where: { id: orderId },
    data: {
      kinguinOrderId: kinguinOrder.orderId,
      kinguinStatus: `${KINGUIN_PLACED_PREFIX}${kinguinOrder.status}`,
      isPreorder: kinguinOrder.isPreorder || isPreorder,
      preorderReleaseAt: kinguinOrder.preorderReleaseDate
        ? new Date(kinguinOrder.preorderReleaseDate)
        : preorderReleaseAt,
    },
  });
}

async function syncKeysFromKinguin(
  orderId: string,
  kinguinOrderId: string,
  items: Array<{
    id: string;
    kinguinOfferId: string;
    kinguinProductId: string;
    kinguinId: number;
  }>,
  kinguin: ReturnType<typeof getKinguinSdk>,
  isPreorder: boolean,
): Promise<FulfillKinguinOrderResult> {
  const keys = await kinguin.getOrderKeys(kinguinOrderId);
  const keysDelivered = await persistKinguinKeys(
    orderId,
    items,
    keys.filter((key) => key.serial.trim().length > 0),
  );

  if (keysDelivered > 0) {
    return {
      status: isPreorder ? "processing" : "completed",
      message: isPreorder
        ? "Preventa confirmada. Te avisamos cuando esté la key."
        : "Tus keys están listas abajo.",
      keysDelivered,
      kinguinOrderId,
    };
  }

  return {
    status: "processing",
    message:
      "Tu pago con Flow ya está confirmado. Estamos esperando las keys del proveedor; aparecerán aquí en cuanto estén listas.",
    keysDelivered: 0,
    kinguinOrderId,
  };
}

type FulfillmentOrder = {
  id: string;
  status: string;
  kinguinOrderId: string | null;
  kinguinStatus: string | null;
  isPreorder: boolean;
  preorderReleaseAt: Date | null;
  createdAt: Date;
  items: Array<{
    id: string;
    kinguinId: number;
    kinguinProductId: string;
    kinguinOfferId: string;
    quantity: number;
    offer: { sourceCostPrice: { toString(): string } | null } | null;
  }>;
};

async function claimKinguinPlacement(
  order: FulfillmentOrder,
): Promise<"claimed" | "busy" | "skip"> {
  if (order.kinguinOrderId) {
    return "skip";
  }

  const placingTs = placingTimestamp(order.kinguinStatus);
  if (placingTs && Date.now() - placingTs < PLACING_STALE_MS) {
    return "busy";
  }

  if (isPlacingStatus(order.kinguinStatus)) {
    await prisma.order.updateMany({
      where: {
        id: order.id,
        kinguinOrderId: null,
        kinguinStatus: { startsWith: KINGUIN_PLACING_PREFIX },
      },
      data: { kinguinStatus: null },
    });
  }

  const claim = await prisma.order.updateMany({
    where: {
      id: order.id,
      kinguinOrderId: null,
      OR: [
        { kinguinStatus: null },
        {
          NOT: { kinguinStatus: { startsWith: KINGUIN_PLACING_PREFIX } },
        },
      ],
    },
    data: {
      kinguinStatus: `${KINGUIN_PLACING_PREFIX}${Date.now()}`,
    },
  });

  return claim.count > 0 ? "claimed" : "busy";
}

async function buildAndPlaceKinguinOrder(
  order: FulfillmentOrder,
  items: Array<{
    id: string;
    kinguinId: number;
    kinguinProductId: string;
    kinguinOfferId: string;
    quantity: number;
    offer: { sourceCostPrice: any } | null;
  }>,
  kinguin: ReturnType<typeof getKinguinSdk>,
): Promise<FulfillKinguinOrderResult> {
  const kinguinProducts = await buildKinguinPlaceOrderProducts(
    items,
    kinguin,
  );

  const totalCostEur = kinguinProducts.reduce(
    (sum, p) => sum + p.price * p.qty,
    0,
  );
  const balance = await getKinguinBalanceCached();

  if (balance < totalCostEur) {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        kinguinStatus: `${KINGUIN_ERROR_PREFIX}Insufficient balance to fulfill order automatically (Cost: ${totalCostEur} EUR, Balance: ${balance} EUR). Manual fulfillment required.`,
      },
    });

    return {
      status: "failed",
      message:
        "Tu pago está confirmado. Estamos preparando la entrega manualmente; revisa Mis pedidos en unos minutos.",
      keysDelivered: 0,
    };
  }

  const kinguinOrder = await placeKinguinOrderWithFallback(
    order.id,
    kinguinProducts,
    kinguin,
    order.createdAt,
  );

  // Refresh balance cache in background
  kinguin
    .getBalance()
    .then((balanceRes) => {
      updateKinguinBalanceCached(balanceRes.balance);
    })
    .catch((err) => {
      console.error("Error refreshing balance cache after order placement:", err);
    });

  await syncKinguinOrderToDb(
    order.id,
    kinguinOrder,
    order.isPreorder,
    order.preorderReleaseAt,
  );

  return syncKeysFromKinguin(
    order.id,
    kinguinOrder.orderId,
    items,
    kinguin,
    order.isPreorder,
  );
}

export async function fulfillKinguinOrder(
  orderId: string,
): Promise<FulfillKinguinOrderResult> {
  if (!isKinguinConfigured()) {
    return {
      status: "failed",
      message:
        "Tu pago está confirmado. Estamos preparando la entrega manualmente; revisa Mis pedidos en unos minutos.",
      keysDelivered: 0,
    };
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        select: {
          id: true,
          kinguinId: true,
          kinguinProductId: true,
          kinguinOfferId: true,
          quantity: true,
          offer: {
            select: {
              sourceCostPrice: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    return {
      status: "failed",
      message: "No encontramos el pedido para completar la entrega.",
      keysDelivered: 0,
    };
  }

  if (order.status !== "PROCESSING" && order.status !== "COMPLETED") {
    return {
      status: "skipped",
      message: "El pedido aún no está listo para la entrega digital.",
      keysDelivered: 0,
    };
  }

  const items = order.items;

  if (items.length === 0) {
    return {
      status: "failed",
      message: "El pedido no tiene productos para entregar.",
      keysDelivered: 0,
    };
  }

  const cachedError = cachedFulfillmentError(order.kinguinStatus);
  if (cachedError && !order.kinguinOrderId) {
    return {
      status: "failed",
      message: cachedError,
      keysDelivered: 0,
    };
  }

  const deliveredKeyCount = await countDeliveredKeys(orderId);
  if (deliveredKeyCount > 0) {
    return {
      status: order.isPreorder ? "processing" : "completed",
      message: "Tus keys están listas abajo.",
      keysDelivered: deliveredKeyCount,
      kinguinOrderId: order.kinguinOrderId ?? undefined,
    };
  }

  const kinguin = getKinguinSdk();

  try {
    if (order.kinguinOrderId) {
      return syncKeysFromKinguin(
        orderId,
        order.kinguinOrderId,
        items,
        kinguin,
        order.isPreorder,
      );
    }

    const claim = await claimKinguinPlacement(order);

    if (claim === "busy") {
      const refreshed = await prisma.order.findUnique({
        where: { id: order.id },
        select: { kinguinOrderId: true, kinguinStatus: true },
      });

      if (refreshed?.kinguinOrderId) {
        return syncKeysFromKinguin(
          orderId,
          refreshed.kinguinOrderId,
          items,
          kinguin,
          order.isPreorder,
        );
      }

      const recovered = await findKinguinOrderByExternalId(
        kinguin,
        order.id,
        order.createdAt,
      );

      if (recovered) {
        await syncKinguinOrderToDb(
          order.id,
          recovered,
          order.isPreorder,
          order.preorderReleaseAt,
        );
        return syncKeysFromKinguin(
          order.id,
          recovered.orderId,
          items,
          kinguin,
          order.isPreorder,
        );
      }

      const placingTs = placingTimestamp(
        refreshed?.kinguinStatus ?? order.kinguinStatus,
      );
      if (placingTs && Date.now() - placingTs >= PLACING_STALE_MS) {
        await clearStalePlacingLock(order.id);
        const retryClaim = await claimKinguinPlacement({
          ...order,
          kinguinStatus: null,
        });
        if (retryClaim === "claimed") {
          return buildAndPlaceKinguinOrder(order, items, kinguin);
        }
      }

      return {
        status: "processing",
        message:
          "Tu pago con Flow ya está confirmado. Estamos obteniendo tus keys del proveedor; aparecerán aquí en cuanto estén listas.",
        keysDelivered: 0,
        kinguinOrderId:
          refreshed?.kinguinOrderId ?? order.kinguinOrderId ?? undefined,
      };
    }

    if (claim === "skip") {
      if (order.kinguinOrderId) {
        return syncKeysFromKinguin(
          orderId,
          order.kinguinOrderId,
          items,
          kinguin,
          order.isPreorder,
        );
      }
    }

    return buildAndPlaceKinguinOrder(order, items, kinguin);
  } catch (error) {
    const message = formatKinguinError(error);

    const recovered = await findKinguinOrderByExternalId(
      kinguin,
      order.id,
      order.createdAt,
    ).catch(() => null);

    if (recovered) {
      await syncKinguinOrderToDb(
        order.id,
        recovered,
        order.isPreorder,
        order.preorderReleaseAt,
      );

      try {
        return await syncKeysFromKinguin(
          orderId,
          recovered.orderId,
          items,
          kinguin,
          order.isPreorder,
        );
      } catch {
        // fall through to error message
      }
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        kinguinStatus: `${KINGUIN_ERROR_PREFIX}${message.slice(0, 180)}`,
      },
    });

    return {
      status: "failed",
      message,
      keysDelivered: 0,
      kinguinOrderId: order.kinguinOrderId ?? recovered?.orderId,
    };
  }
}
