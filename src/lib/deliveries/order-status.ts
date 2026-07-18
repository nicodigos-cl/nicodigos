import "server-only";

import { DeliveryStatus, OrderStatus, type Prisma } from "@/generated/prisma/client";

export async function recalculateOrderStatus(
  tx: Prisma.TransactionClient,
  orderId: string,
): Promise<OrderStatus> {
  const order = await tx.order.findUniqueOrThrow({
    where: { id: orderId },
    select: {
      status: true,
      items: { select: { delivery: { select: { status: true } } } },
    },
  });

  if (order.status === OrderStatus.CANCELED || order.status === OrderStatus.REFUNDED) {
    return order.status;
  }

  const statuses = order.items.flatMap((item) =>
    item.delivery ? [item.delivery.status] : [],
  );
  let next = order.status;
  if (statuses.length > 0 && statuses.every((status) => status === DeliveryStatus.DELIVERED)) {
    next = OrderStatus.FULFILLED;
  } else if (statuses.some((status) => status === DeliveryStatus.DELIVERED)) {
    next = OrderStatus.PARTIALLY_FULFILLED;
  } else if (
    statuses.some((status) =>
      ([
        DeliveryStatus.QUEUED,
        DeliveryStatus.PROCESSING,
        DeliveryStatus.FAILED,
        DeliveryStatus.MANUAL_REVIEW,
      ] as DeliveryStatus[]).includes(status),
    )
  ) {
    next = OrderStatus.PROCESSING;
  } else if (order.status !== OrderStatus.PENDING) {
    next = OrderStatus.PAID;
  }

  if (next !== order.status) {
    await tx.order.update({ where: { id: orderId }, data: { status: next } });
  }
  return next;
}
