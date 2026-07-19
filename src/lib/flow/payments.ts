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
  const { getOperationalSettings } = await import("@/lib/settings/runtime");
  const settings = await getOperationalSettings();

  if (!settings.flowEnabled) {
    throw new Error("Flow.cl está desactivado en los ajustes de la tienda.");
  }

  if (settings.storeStatus === "CLOSED" || settings.storeStatus === "MAINTENANCE") {
    throw new Error("No se pueden crear pagos mientras la tienda no está abierta.");
  }

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

  const currency = order.currency || "CLP";
  if (
    settings.strictCurrencyValidation &&
    currency.toUpperCase() !== settings.acceptedCurrency.toUpperCase()
  ) {
    throw new Error(
      `La moneda del pedido (${currency}) no coincide con la aceptada (${settings.acceptedCurrency}).`,
    );
  }

  const amount = toFlowAmount(order.total);
  if (
    settings.minPaymentAmount !== null &&
    amount < settings.minPaymentAmount
  ) {
    throw new Error("El monto del pedido es inferior al mínimo permitido.");
  }
  if (
    settings.maxPaymentAmount !== null &&
    amount > settings.maxPaymentAmount
  ) {
    throw new Error("El monto del pedido supera el máximo permitido.");
  }

  if (!settings.reusePendingPaymentIntent && order.payments.length > 0) {
    throw new Error(
      "Ya existe una intención de pago pendiente para esta orden.",
    );
  }

  const flow = getFlowClient();
  const baseUrl = getAppBaseUrl();
  // commerceOrder must remain the order id — Flow reconciliation matches orderId.
  const commerceOrder = order.id;
  const subjectPrefix = settings.commerceOrderPrefix.trim();
  const subject =
    order.items.length === 0
      ? `${subjectPrefix ? `${subjectPrefix} ` : ""}Orden Nicodigos ${order.id.slice(-8)}`
      : order.items
          .map((item) => `${item.quantity}× ${item.productName}`)
          .join(", ")
          .slice(0, 100);

  const created = await flow.payments.create({
    commerceOrder,
    subject,
    currency,
    amount,
    email: order.email,
    urlReturn: `${baseUrl}/checkout/return?orderId=${encodeURIComponent(order.id)}`,
    urlConfirmation: `${baseUrl}/api/payments/flow/confirmation`,
    optional: { orderId: order.id },
  });

  const existing = order.payments[0];
  const payment = await prisma.$transaction(async (tx) => {
    const data = {
      amount,
      currency: order.currency || "CLP",
      externalId: created.token,
      flowOrder: created.flowOrder,
      commerceOrder: order.id,
      payerEmail: order.email,
      providerStatus: "Pendiente",
      lastProviderCheckAt: new Date(),
      status: PaymentStatus.PENDING,
      failureCode: null,
      failureMessage: null,
    };
    const row = existing
      ? await tx.payment.update({ where: { id: existing.id }, data, select: { id: true } })
      : await tx.payment.create({ data: { ...data, orderId: order.id, provider: PaymentProvider.FLOW }, select: { id: true } });
    await tx.paymentEvent.create({ data: {
      paymentId: row.id,
      type: "SESSION_STARTED",
      source: "SYSTEM",
      statusAfter: PaymentStatus.PENDING,
      message: "Sesión de pago iniciada en Flow.",
      providerRef: String(created.flowOrder),
      idempotencyKey: `flow-session:${created.token}`,
    } });
    return row;
  });

  return {
    paymentId: payment.id,
    token: created.token,
    flowOrder: created.flowOrder,
    redirectUrl: created.redirectUrl,
    checkoutUrl: `${baseUrl}/checkout/${encodeURIComponent(order.id)}`,
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
