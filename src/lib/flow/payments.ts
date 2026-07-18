import "server-only";

import { PaymentProvider, PaymentStatus } from "@/generated/prisma/client";
import { getAppBaseUrl, getFlowClient } from "@/lib/flow/client";
import prisma from "@/lib/prisma";

export type FlowPaymentLinkResult = {
  paymentId: string;
  token: string;
  flowOrder: number;
  redirectUrl: string;
  checkoutUrl: string;
};

function toFlowAmount(amount: { toString(): string } | number): number {
  const value =
    typeof amount === "number" ? amount : Number.parseFloat(amount.toString());
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("El monto del pago no es válido.");
  }
  return Math.round(value);
}

export async function createFlowPaymentForOrder(orderId: string): Promise<FlowPaymentLinkResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      email: true,
      total: true,
      currency: true,
      status: true,
      items: {
        select: { productName: true, quantity: true },
        take: 3,
      },
      payments: {
        where: {
          provider: PaymentProvider.FLOW,
          status: PaymentStatus.PENDING,
        },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, externalId: true, amount: true },
      },
    },
  });

  if (!order) {
    throw new Error("Orden no encontrada.");
  }

  if (order.status !== "PENDING") {
    throw new Error("Solo se puede generar un link de pago para órdenes pendientes.");
  }

  const flow = getFlowClient();
  const baseUrl = getAppBaseUrl();
  const amount = toFlowAmount(order.total);
  const subject =
    order.items.length === 0
      ? `Orden Nicodigos ${order.id.slice(-8)}`
      : order.items
          .map((item) => `${item.quantity}× ${item.productName}`)
          .join(", ")
          .slice(0, 100);

  const created = await flow.payments.create({
    commerceOrder: order.id,
    subject,
    currency: order.currency || "CLP",
    amount,
    email: order.email,
    urlReturn: `${baseUrl}/checkout/return?orderId=${encodeURIComponent(order.id)}`,
    urlConfirmation: `${baseUrl}/api/payments/flow/confirmation`,
    optional: { orderId: order.id },
  });

  const existing = order.payments[0];
  const payment = existing
    ? await prisma.payment.update({
        where: { id: existing.id },
        data: {
          amount,
          currency: order.currency || "CLP",
          externalId: created.token,
          status: PaymentStatus.PENDING,
          failureCode: null,
          failureMessage: null,
        },
        select: { id: true },
      })
    : await prisma.payment.create({
        data: {
          orderId: order.id,
          provider: PaymentProvider.FLOW,
          status: PaymentStatus.PENDING,
          amount,
          currency: order.currency || "CLP",
          externalId: created.token,
        },
        select: { id: true },
      });

  return {
    paymentId: payment.id,
    token: created.token,
    flowOrder: created.flowOrder,
    redirectUrl: created.redirectUrl,
    checkoutUrl: `${baseUrl}/checkout?orderId=${encodeURIComponent(order.id)}`,
  };
}

export async function getOrCreateFlowRedirectUrl(
  orderId: string,
): Promise<string> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true },
  });

  if (!order) {
    throw new Error("Orden no encontrada.");
  }

  if (order.status === "PAID" || order.status === "FULFILLED") {
    throw new Error("Esta orden ya está pagada.");
  }

  if (order.status === "CANCELED" || order.status === "REFUNDED") {
    throw new Error("Esta orden no admite pago.");
  }

  const result = await createFlowPaymentForOrder(orderId);
  return result.redirectUrl;
}
