import "server-only";

import {
  DeliveryEventSource,
  DeliveryStatus,
  type Prisma,
} from "@/generated/prisma/client";
import { createLogger } from "@/lib/logger";

const log = createLogger({ module: "admin-deliveries" });

type Tx = Prisma.TransactionClient;

/**
 * Ensures every order item has a Delivery row (idempotent).
 * Called when an order becomes PAID or when admin opens deliveries.
 */
export async function ensureDeliveriesForOrder(
  orderId: string,
  tx?: Tx,
): Promise<{ created: number; requested: number }> {
  const { getOperationalSettings } = await import("@/lib/settings/runtime");
  const settings = await getOperationalSettings();
  if (!settings.automaticDeliveryEnabled) {
    log.info(
      { orderId },
      "automatic deliveries disabled — skipping ensureDeliveriesForOrder",
    );
    return { created: 0, requested: 0 };
  }

  const client = tx;
  if (!client) {
    const prisma = (await import("@/lib/prisma")).default;
    return prisma.$transaction((inner) =>
      ensureDeliveriesForOrder(orderId, inner),
    );
  }

  const items = await client.orderItem.findMany({
    where: { orderId },
    select: {
      id: true,
      deliveryMethod: true,
      delivery: { select: { id: true, status: true } },
    },
  });
  const order = await client.order.findUniqueOrThrow({
    where: { id: orderId },
    select: {
      status: true,
      payments: { where: { status: "PAID" }, take: 1, select: { id: true } },
    },
  });
  const isPaid =
    ["PAID", "PROCESSING", "FULFILLED", "PARTIALLY_FULFILLED"].includes(order.status) ||
    order.payments.length > 0;

  let created = 0;
  const deliveryIds: string[] = [];
  const shouldRequest = (method: (typeof items)[number]["deliveryMethod"]) => {
    if (!isPaid) return false;
    if (!settings.autoSendAfterPayment) return false;
    if (method === "MANUAL") {
      return settings.manualDeliveryEnabled && settings.keysAutoAssign;
    }
    if (method === "SMM") return settings.smmAutoSend;
    return true;
  };
  for (const item of items) {
    if (item.delivery) {
      if (
        shouldRequest(item.deliveryMethod) &&
        ([
          DeliveryStatus.PENDING,
          DeliveryStatus.QUEUED,
          DeliveryStatus.FAILED,
        ] as DeliveryStatus[]).includes(item.delivery.status)
      ) {
        deliveryIds.push(item.delivery.id);
      }
      continue;
    }
    const delivery = await client.delivery.create({
      data: {
        orderItemId: item.id,
        deliveryMethod: item.deliveryMethod,
        status: DeliveryStatus.PENDING,
        events: {
          create: {
            status: DeliveryStatus.PENDING,
            message: "Entrega creada",
            source: DeliveryEventSource.SYSTEM,
          },
        },
      },
      select: { id: true },
    });
    await client.delivery.update({
      where: { id: delivery.id },
      data: { idempotencyKey: `delivery:${delivery.id}` },
    });
    if (shouldRequest(item.deliveryMethod)) deliveryIds.push(delivery.id);
    created += 1;
  }

  const requested = deliveryIds.length
    ? await client.outboxEvent.createMany({
        data: deliveryIds.map((deliveryId) => ({
          type: "DELIVERY_REQUESTED" as const,
          aggregateId: deliveryId,
          idempotencyKey: `delivery-requested:${deliveryId}`,
          payload: { deliveryId },
        })),
        skipDuplicates: true,
      })
    : { count: 0 };

  if (created > 0) {
    log.info({ orderId, created }, "Deliveries ensured for order");
  }

  return { created, requested: requested.count };
}
