import {
  DeliveryStatus,
  OrderStatus,
  PaymentStatus,
} from "@/generated/prisma/client";

import type { OrderLivePhase } from "@/lib/order-live/events";

export function deriveOrderLivePhase(input: {
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus | null;
  deliveryStatuses: DeliveryStatus[];
}): OrderLivePhase {
  const { orderStatus, paymentStatus, deliveryStatuses } = input;

  if (
    orderStatus === OrderStatus.CANCELED ||
    orderStatus === OrderStatus.REFUNDED ||
    paymentStatus === PaymentStatus.REJECTED ||
    paymentStatus === PaymentStatus.FAILED ||
    paymentStatus === PaymentStatus.CANCELLED ||
    paymentStatus === PaymentStatus.EXPIRED
  ) {
    return "ERROR";
  }

  if (
    orderStatus === OrderStatus.PENDING ||
    paymentStatus === PaymentStatus.PENDING ||
    paymentStatus === PaymentStatus.PROCESSING ||
    paymentStatus == null
  ) {
    if (
      paymentStatus !== PaymentStatus.PAID &&
      orderStatus === OrderStatus.PENDING
    ) {
      return "AWAITING_PAYMENT";
    }
  }

  if (deliveryStatuses.some((s) => s === DeliveryStatus.MANUAL_REVIEW)) {
    return "MANUAL_REVIEW";
  }

  if (deliveryStatuses.some((s) => s === DeliveryStatus.FAILED)) {
    return "ERROR";
  }

  if (orderStatus === OrderStatus.FULFILLED) {
    return "DELIVERED";
  }

  if (orderStatus === OrderStatus.PARTIALLY_FULFILLED) {
    return "PARTIALLY_DELIVERED";
  }

  if (deliveryStatuses.some((s) => s === DeliveryStatus.PROCESSING)) {
    return "PROCESSING_PROVIDER";
  }

  if (
    deliveryStatuses.some(
      (s) => s === DeliveryStatus.QUEUED || s === DeliveryStatus.PENDING,
    )
  ) {
    return "PREPARING_DELIVERY";
  }

  if (
    orderStatus === OrderStatus.PAID ||
    orderStatus === OrderStatus.PROCESSING ||
    paymentStatus === PaymentStatus.PAID
  ) {
    if (deliveryStatuses.length === 0) return "PAYMENT_CONFIRMED";
    if (deliveryStatuses.every((s) => s === DeliveryStatus.DELIVERED)) {
      return "DELIVERED";
    }
    return "PREPARING_DELIVERY";
  }

  return "AWAITING_PAYMENT";
}
