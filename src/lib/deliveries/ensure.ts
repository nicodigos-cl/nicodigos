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
): Promise<{ created: number }> {
  const { getOperationalSettings } = await import("@/lib/settings/runtime");
  const settings = await getOperationalSettings();
  if (!settings.automaticDeliveryEnabled) {
    log.info(
      { orderId },
      "automatic deliveries disabled — skipping ensureDeliveriesForOrder",
    );
    return { created: 0 };
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
      delivery: { select: { id: true } },
    },
  });

  let created = 0;
  for (const item of items) {
    if (item.delivery) continue;
    await client.delivery.create({
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
    });
    created += 1;
  }

  if (created > 0) {
    log.info({ orderId, created }, "Deliveries ensured for order");
  }

  return { created };
}
