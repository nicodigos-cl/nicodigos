import "server-only";

import {
  DeliveryStatus,
  OrderStatus,
  PaymentStatus,
} from "@/generated/prisma/client";

import prisma from "@/lib/prisma";

export class OwnershipError extends Error {
  readonly code: "NOT_FOUND" | "FORBIDDEN" | "UNAVAILABLE";

  constructor(code: "NOT_FOUND" | "FORBIDDEN" | "UNAVAILABLE", message: string) {
    super(message);
    this.name = "OwnershipError";
    this.code = code;
  }
}

const paidLikeStatuses: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.PROCESSING,
  OrderStatus.FULFILLED,
  OrderStatus.PARTIALLY_FULFILLED,
];

export async function requireOwnedOrder(orderId: string, userId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    select: {
      id: true,
      userId: true,
      status: true,
      email: true,
      customerName: true,
      subtotal: true,
      total: true,
      currency: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!order) {
    throw new OwnershipError("NOT_FOUND", "Pedido no encontrado.");
  }

  return order;
}

export async function requireOwnedDelivery(deliveryId: string, userId: string) {
  const delivery = await prisma.delivery.findFirst({
    where: {
      id: deliveryId,
      orderItem: { order: { userId } },
    },
    select: {
      id: true,
      status: true,
      deliveryMethod: true,
      customerMessage: true,
      deliveredAt: true,
      createdAt: true,
      updatedAt: true,
      externalStatus: true,
      smmStartCount: true,
      smmRemains: true,
      errorMessage: true,
      orderItem: {
        select: {
          id: true,
          productId: true,
          productName: true,
          quantity: true,
          unitPrice: true,
          deliveryMethod: true,
          smm: {
            select: {
              link: true,
              username: true,
              quantity: true,
            },
          },
          order: {
            select: {
              id: true,
              userId: true,
              status: true,
              email: true,
              currency: true,
              payments: {
                orderBy: { createdAt: "desc" },
                take: 1,
                select: { id: true, status: true },
              },
            },
          },
        },
      },
    },
  });

  if (!delivery) {
    throw new OwnershipError("NOT_FOUND", "Entrega no encontrada.");
  }

  const order = delivery.orderItem.order;
  const paymentStatus = order.payments[0]?.status ?? null;
  const orderAllowsDelivery =
    paidLikeStatuses.includes(order.status) ||
    paymentStatus === PaymentStatus.PAID;

  if (!orderAllowsDelivery && delivery.status !== DeliveryStatus.DELIVERED) {
    throw new OwnershipError(
      "UNAVAILABLE",
      "Esta entrega no está disponible. Revisa el estado del pedido o contacta soporte.",
    );
  }

  return delivery;
}

export function isOwnershipError(error: unknown): error is OwnershipError {
  return error instanceof OwnershipError;
}
