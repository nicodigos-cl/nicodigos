import {
  DeliveryMethod,
  DeliveryStatus,
  OrderStatus,
  PaymentStatus,
  type Prisma,
} from "@/generated/prisma/client";

import { deriveCustomerOrderDeliverySummary } from "@/lib/customer-dashboard/delivery-summary";
import {
  abbreviateUrl,
  formatCustomerOrderNumber,
} from "@/lib/customer-dashboard/format";
import { deriveCustomerPaymentSummary } from "@/lib/customer-dashboard/payment-summary";
import {
  customerCheckoutPath,
  customerOrderPath,
  customerOrderSupportPath,
} from "@/lib/customer-dashboard/paths";
import {
  computeSmmProgressPercent,
  getCustomerDeliveryMethodLabel,
  getCustomerDeliveryStatusView,
  getCustomerOrderStatusView,
  getCustomerPaymentMethodLabel,
  getCustomerPaymentStatusView,
  getCustomerSmmStatusView,
  resolveOrderPrimaryAction,
} from "@/lib/customer-dashboard/status";
import type {
  CustomerOrderAction,
  CustomerOrderSummary,
  CustomerOrderTimelineEvent,
} from "@/lib/customer-dashboard/types";
import { getCustomerDeliveryErrorMessage } from "@/lib/customer-dashboard/delivery-summary";
import { maskSecret } from "@/lib/crypto/mask";
import { decimalToString, formatMoney } from "@/lib/products/format";

export const orderListSelect = {
  id: true,
  status: true,
  total: true,
  currency: true,
  createdAt: true,
  updatedAt: true,
  items: {
    select: {
      productName: true,
      quantity: true,
      product: {
        select: {
          coverImageUrl: true,
        },
      },
      delivery: {
        select: {
          id: true,
          status: true,
          deliveryMethod: true,
          orderItem: {
            select: {
              smm: { select: { link: true, username: true } },
            },
          },
        },
      },
    },
  },
  payments: {
    orderBy: { createdAt: "desc" as const },
    take: 5,
    select: {
      id: true,
      status: true,
      amount: true,
      currency: true,
      provider: true,
      paymentMethod: true,
      paidAt: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} satisfies Prisma.OrderSelect;

export type OrderListRow = Prisma.OrderGetPayload<{
  select: typeof orderListSelect;
}>;

export function mapOrderSummaryFromRow(order: OrderListRow): CustomerOrderSummary {
  const deliveries = order.items
    .map((item) => item.delivery)
    .filter((d): d is NonNullable<typeof d> => Boolean(d));

  const deliverySummary = deriveCustomerOrderDeliverySummary({
    totalItems: order.items.length,
    deliveries: deliveries.map((d) => ({ id: d.id, status: d.status })),
  });

  const paymentSummary = deriveCustomerPaymentSummary(
    order.payments.map((p) => ({
      id: p.id,
      status: p.status,
      amount: decimalToString(p.amount) ?? "0",
      currency: p.currency,
      provider: p.provider,
      paymentMethod: p.paymentMethod,
      paidAt: p.paidAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),
  );

  const needsSmmTargetDeliveryId =
    order.items.find((item) => {
      const delivery = item.delivery;
      if (!delivery || delivery.deliveryMethod !== DeliveryMethod.SMM) {
        return false;
      }
      if (
        delivery.status !== DeliveryStatus.PENDING &&
        delivery.status !== DeliveryStatus.QUEUED &&
        delivery.status !== DeliveryStatus.PROCESSING
      ) {
        return false;
      }
      const smm = delivery.orderItem.smm;
      return !smm?.link?.trim() && !smm?.username?.trim();
    })?.delivery?.id ?? null;

  const total = decimalToString(order.total) ?? "0";
  const deliveryStatus =
    deliveries.find((d) => d.status === DeliveryStatus.DELIVERED)?.status ??
    deliveries.find((d) => d.status === DeliveryStatus.MANUAL_REVIEW)?.status ??
    deliveries.find((d) => d.status === DeliveryStatus.FAILED)?.status ??
    deliveries.find((d) => d.status === DeliveryStatus.QUEUED)?.status ??
    deliveries.find((d) => d.status === DeliveryStatus.PROCESSING)?.status ??
    deliveries[0]?.status ??
    null;

  return {
    id: order.id,
    number: formatCustomerOrderNumber(order.id),
    status: order.status,
    statusView: getCustomerOrderStatusView(order.status),
    paymentStatus: paymentSummary.status,
    paymentStatusView: paymentSummary.statusView,
    deliveryStatus,
    deliveryStatusView: deliveryStatus
      ? getCustomerDeliveryStatusView(deliveryStatus)
      : null,
    deliverySummary,
    total,
    totalFormatted: formatMoney(total, order.currency),
    currency: order.currency,
    itemsCount: order.items.length,
    productNames: order.items.map((item) => item.productName),
    productPreview: order.items.slice(0, 2).map((item) => ({
      name: item.productName,
      quantity: item.quantity,
      imageUrl: item.product.coverImageUrl,
    })),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    primaryAction: resolveOrderPrimaryAction({
      orderId: order.id,
      orderStatus: order.status,
      paymentStatus: paymentSummary.status,
      availableDeliveryId: deliverySummary.availableDeliveryId,
      needsSmmTargetDeliveryId,
      hasFailedDelivery: deliverySummary.failedCount > 0,
    }),
  };
}

export function buildCustomerOrderTimeline(input: {
  orderId: string;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
  payment: {
    id: string;
    status: PaymentStatus;
    paidAt: Date | null;
    createdAt: Date;
  } | null;
  deliveryEvents: Array<{
    id: string;
    status: DeliveryStatus;
    message: string | null;
    source: string;
    createdAt: Date;
    deliveryMethod: DeliveryMethod;
  }>;
}): CustomerOrderTimelineEvent[] {
  const events: CustomerOrderTimelineEvent[] = [
    {
      id: `created-${input.orderId}`,
      type: "ORDER_CREATED",
      title: "Pedido creado",
      label: "Pedido creado",
      description: null,
      occurredAt: input.createdAt.toISOString(),
      createdAt: input.createdAt.toISOString(),
      tone: "neutral",
    },
  ];

  const payment = input.payment;
  if (payment) {
    if (payment.status === PaymentStatus.PAID && payment.paidAt) {
      events.push({
        id: `paid-${payment.id}`,
        type: "PAYMENT_CONFIRMED",
        title: "Pago confirmado",
        label: "Pago confirmado",
        description: null,
        occurredAt: payment.paidAt.toISOString(),
        createdAt: payment.paidAt.toISOString(),
        tone: "success",
      });
    } else if (
      payment.status === PaymentStatus.PENDING ||
      payment.status === PaymentStatus.PROCESSING
    ) {
      events.push({
        id: `pay-pending-${payment.id}`,
        type: "PAYMENT_PENDING",
        title: "Pago pendiente",
        label: "Pago pendiente",
        description: null,
        occurredAt: payment.createdAt.toISOString(),
        createdAt: payment.createdAt.toISOString(),
        tone: "warning",
      });
    } else if (
      payment.status === PaymentStatus.FAILED ||
      payment.status === PaymentStatus.REJECTED ||
      payment.status === PaymentStatus.EXPIRED
    ) {
      events.push({
        id: `pay-failed-${payment.id}`,
        type: "PAYMENT_FAILED",
        title: "Pago no completado",
        label: "Pago no completado",
        description: "Puedes intentar pagar nuevamente.",
        occurredAt: payment.createdAt.toISOString(),
        createdAt: payment.createdAt.toISOString(),
        tone: "danger",
      });
    }
  }

  if (
    input.status === OrderStatus.PROCESSING ||
    input.status === OrderStatus.PAID
  ) {
    events.push({
      id: `processing-${input.orderId}`,
      type: "ORDER_PROCESSING",
      title: "Estamos preparando tu pedido",
      label: "Estamos preparando tu pedido",
      description: null,
      occurredAt: input.updatedAt.toISOString(),
      createdAt: input.updatedAt.toISOString(),
      tone: "info",
    });
  }

  const seenDeliveryStatuses = new Set<string>();
  for (const event of input.deliveryEvents) {
    if (event.source === "ADMIN") continue;
    const key = `${event.status}:${event.deliveryMethod}`;
    if (seenDeliveryStatuses.has(key) && event.status !== DeliveryStatus.DELIVERED) {
      continue;
    }
    seenDeliveryStatuses.add(key);

    if (event.status === DeliveryStatus.QUEUED || event.status === DeliveryStatus.PROCESSING) {
      events.push({
        id: event.id,
        type: "DELIVERY_PROCESSING",
        title:
          event.deliveryMethod === DeliveryMethod.SMM
            ? "Servicio en proceso"
            : "Entrega iniciada",
        label:
          event.deliveryMethod === DeliveryMethod.SMM
            ? "Servicio en proceso"
            : "Entrega iniciada",
        description: null,
        occurredAt: event.createdAt.toISOString(),
        createdAt: event.createdAt.toISOString(),
        tone: "info",
      });
    } else if (event.status === DeliveryStatus.DELIVERED) {
      events.push({
        id: event.id,
        type: "DELIVERY_AVAILABLE",
        title:
          event.deliveryMethod === DeliveryMethod.SMM
            ? "Servicio completado"
            : event.deliveryMethod === DeliveryMethod.KINGUIN
              ? "Key disponible"
              : "Entrega completada",
        label:
          event.deliveryMethod === DeliveryMethod.SMM
            ? "Servicio completado"
            : event.deliveryMethod === DeliveryMethod.KINGUIN
              ? "Key disponible"
              : "Entrega completada",
        description: null,
        occurredAt: event.createdAt.toISOString(),
        createdAt: event.createdAt.toISOString(),
        tone: "success",
      });
    } else if (event.status === DeliveryStatus.FAILED || event.status === DeliveryStatus.MANUAL_REVIEW) {
      events.push({
        id: event.id,
        type: "DELIVERY_FAILED",
        title: "Estamos revisando tu entrega",
        label: "Estamos revisando tu entrega",
        description: "Nuestro equipo está revisando el caso.",
        occurredAt: event.createdAt.toISOString(),
        createdAt: event.createdAt.toISOString(),
        tone: "danger",
      });
    }
  }

  if (input.status === OrderStatus.FULFILLED) {
    events.push({
      id: `completed-${input.orderId}`,
      type: "ORDER_COMPLETED",
      title: "Pedido completado",
      label: "Pedido completado",
      description: null,
      occurredAt: input.updatedAt.toISOString(),
      createdAt: input.updatedAt.toISOString(),
      tone: "success",
    });
  }

  if (input.status === OrderStatus.CANCELED) {
    events.push({
      id: `canceled-${input.orderId}`,
      type: "ORDER_CANCELLED",
      title: "Pedido cancelado",
      label: "Pedido cancelado",
      description: null,
      occurredAt: input.updatedAt.toISOString(),
      createdAt: input.updatedAt.toISOString(),
      tone: "neutral",
    });
  }

  if (input.status === OrderStatus.REFUNDED) {
    events.push({
      id: `refunded-${input.orderId}`,
      type: "ORDER_REFUNDED",
      title: "Reembolso confirmado",
      label: "Reembolso confirmado",
      description: null,
      occurredAt: input.updatedAt.toISOString(),
      createdAt: input.updatedAt.toISOString(),
      tone: "neutral",
    });
  }

  events.sort(
    (a, b) =>
      new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
  );

  return events;
}

export function buildAvailableActions(input: {
  orderId: string;
  status: OrderStatus;
  primaryAction: CustomerOrderAction;
  canPay: boolean;
  canRetry: boolean;
  canBuyAgain: boolean;
  availableDeliveryId: string | null;
}): CustomerOrderAction[] {
  const actions: CustomerOrderAction[] = [input.primaryAction];
  const types = new Set<CustomerOrderAction["type"]>([input.primaryAction.type]);

  const push = (action: CustomerOrderAction) => {
    if (types.has(action.type)) return;
    types.add(action.type);
    actions.push(action);
  };

  if (input.canRetry) {
    push({
      type: "RETRY_PAYMENT",
      label: "Reintentar pago",
      orderId: input.orderId,
      href: customerCheckoutPath(input.orderId),
    });
  } else if (input.canPay) {
    push({
      type: "PAY",
      label: "Completar pago",
      href: customerCheckoutPath(input.orderId),
    });
  }

  if (input.availableDeliveryId) {
    push({
      type: "VIEW_DELIVERY",
      label: "Ver entrega",
      href: `/dashboard/deliveries/${input.availableDeliveryId}`,
    });
  }

  if (input.canBuyAgain) {
    push({
      type: "BUY_AGAIN",
      label: "Comprar nuevamente",
      orderId: input.orderId,
    });
  }

  push({
    type: "CONTACT_SUPPORT",
    label: "Contactar soporte",
    href: customerOrderSupportPath(input.orderId),
  });

  push({
    type: "VIEW",
    label: "Ver pedido",
    href: customerOrderPath(input.orderId),
  });

  return actions;
}

export function mapDeliveryKeysPreview(
  keys: Array<{ id: string; serial: string }>,
  status: DeliveryStatus,
): Array<{ id: string; masked: string }> {
  if (status !== DeliveryStatus.DELIVERED) return [];
  return keys.slice(0, 3).map((key) => ({
    id: key.id,
    masked: maskSecret(key.serial),
  }));
}

export {
  abbreviateUrl,
  getCustomerDeliveryMethodLabel,
  getCustomerPaymentMethodLabel,
  getCustomerPaymentStatusView,
  getCustomerSmmStatusView,
  computeSmmProgressPercent,
  getCustomerDeliveryErrorMessage,
  decimalToString,
  formatMoney,
  formatCustomerOrderNumber,
};
