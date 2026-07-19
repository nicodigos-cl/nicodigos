import "server-only";

import {
  DeliveryStatus,
  type DeliveryPromise,
} from "@/generated/prisma/client";

import {
  MANUAL_REVIEW_CUSTOMER_MESSAGE,
  ORDER_LIVE_PHASE_COPY,
  type OrderLiveSnapshot,
} from "@/lib/order-live/events";
import { deriveOrderLivePhase } from "@/lib/order-live/phase";
import prisma from "@/lib/prisma";
import { isDelayedDeliveryPromise } from "@/lib/delivery-promise/calculate";

export { deriveOrderLivePhase };

function pickDominantPromise(
  promises: Array<DeliveryPromise | null | undefined>,
): DeliveryPromise | null {
  if (promises.some((p) => p === "UNAVAILABLE")) return "UNAVAILABLE";
  if (promises.some((p) => p === "DELAYED_12_24H")) return "DELAYED_12_24H";
  if (promises.some((p) => p === "INSTANT")) return "INSTANT";
  return null;
}

export async function getOrderLiveSnapshot(
  orderId: string,
): Promise<OrderLiveSnapshot | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      userId: true,
      status: true,
      updatedAt: true,
      payments: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { status: true },
      },
      items: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          productName: true,
          deliveryMethod: true,
          deliveryPromise: true,
          delivery: {
            select: {
              status: true,
              customerMessage: true,
            },
          },
        },
      },
    },
  });

  if (!order) return null;

  const deliveryStatuses = order.items
    .map((item) => item.delivery?.status)
    .filter((status): status is DeliveryStatus => Boolean(status));

  const paymentStatus = order.payments[0]?.status ?? null;
  const phase = deriveOrderLivePhase({
    orderStatus: order.status,
    paymentStatus,
    deliveryStatuses,
  });
  const copy = ORDER_LIVE_PHASE_COPY[phase];
  const promises = order.items.map((item) => item.deliveryPromise);
  const deliveryPromise = pickDominantPromise(promises);

  const message =
    phase === "MANUAL_REVIEW"
      ? MANUAL_REVIEW_CUSTOMER_MESSAGE
      : copy.message;

  return {
    orderId: order.id,
    userId: order.userId,
    phase,
    title: copy.title,
    message,
    orderStatus: order.status,
    paymentStatus,
    deliveryPromise,
    hasDelayedPromise: isDelayedDeliveryPromise(deliveryPromise),
    items: order.items.map((item) => ({
      orderItemId: item.id,
      productName: item.productName,
      deliveryMethod: item.deliveryMethod,
      status: item.delivery?.status ?? "PENDING",
      customerMessage:
        item.delivery?.status === DeliveryStatus.MANUAL_REVIEW
          ? MANUAL_REVIEW_CUSTOMER_MESSAGE
          : (item.delivery?.customerMessage ?? null),
      deliveryPromise: item.deliveryPromise,
    })),
    updatedAt: order.updatedAt.toISOString(),
  };
}
