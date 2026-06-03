import "server-only";

import { revalidatePath } from "next/cache";
import {
  flowConfirmationUrl,
  flowReturnUrl,
  getFlowPublicBaseUrl,
  getSiteBaseUrl,
  isFlowConfigured,
} from "@/lib/payments/flow/config";
import { getFlowClient } from "@/lib/payments/flow/client";
import prisma from "@/lib/prisma";
import { recordTransaction } from "@/lib/transactions/record";
import { storeRoutes } from "@/lib/store/navigation";

export type FlowPaymentOutcome =
  | "paid"
  | "pending"
  | "rejected"
  | "canceled"
  | "not_found"
  | "misconfigured";

export type FlowPaymentConfirmation = {
  outcome: FlowPaymentOutcome;
  orderId?: string;
  flowOrder?: number;
  amount?: number;
  message: string;
};

function flowChargeIdempotencyKey(orderId: string): string {
  return `flow:charge:${orderId}`;
}

function revalidateCheckoutPaths() {
  revalidatePath(storeRoutes.cart);
  revalidatePath("/");
  revalidatePath(storeRoutes.checkoutReturn);
  revalidatePath("/dashboard/orders");
}

async function clearUserCart(userId: string): Promise<void> {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (cart) {
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  }
}

export async function confirmFlowPaymentByToken(
  token: string,
): Promise<FlowPaymentConfirmation> {
  const safeToken = token.trim();

  if (!safeToken) {
    return {
      outcome: "not_found",
      message: "Token de pago no válido.",
    };
  }

  if (!isFlowConfigured()) {
    return {
      outcome: "misconfigured",
      message: "El pago con Flow no está configurado en este entorno.",
    };
  }

  const flow = getFlowClient();
  const payment = await flow.payments.status.byToken(safeToken);
  const orderId = payment.commerceOrder?.trim();

  if (!orderId) {
    return {
      outcome: "not_found",
      message: "No encontramos el pedido asociado a este pago.",
    };
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      userId: true,
      status: true,
      total: true,
      currency: true,
    },
  });

  if (!order) {
    return {
      outcome: "not_found",
      message: "El pedido no existe o fue eliminado.",
    };
  }

  const expectedAmount = Math.round(Number(order.total.toString()));
  const paidAmount = Math.round(Number(payment.amount));

  if (expectedAmount !== paidAmount) {
    return {
      outcome: "not_found",
      orderId: order.id,
      message: "El monto del pago no coincide con el pedido.",
    };
  }

  if (payment.status === 2) {
    if (order.status === "PENDING") {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "PROCESSING" },
      });

      await recordTransaction({
        userId: order.userId,
        orderId: order.id,
        type: "CHARGE",
        status: "SUCCEEDED",
        amount: order.total,
        currency: order.currency,
        provider: "flow",
        providerReference: String(payment.flowOrder),
        description: `Pago Flow pedido ${order.id}`,
        idempotencyKey: flowChargeIdempotencyKey(order.id),
        processedAt: new Date(),
        metadata: {
          flowOrder: payment.flowOrder,
          flowToken: safeToken,
          flowStatus: payment.status,
          payer: payment.payer,
        },
      });

      await clearUserCart(order.userId);
      revalidateCheckoutPaths();
    }

    return {
      outcome: "paid",
      orderId: order.id,
      flowOrder: payment.flowOrder,
      amount: paidAmount,
      message: "Pago recibido. Estamos preparando tu pedido.",
    };
  }

  if (payment.status === 1) {
    return {
      outcome: "pending",
      orderId: order.id,
      flowOrder: payment.flowOrder,
      amount: paidAmount,
      message:
        "Tu pago está pendiente. Te avisaremos cuando se confirme (p. ej. pago en efectivo).",
    };
  }

  if (order.status === "PENDING") {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "CANCELED" },
    });
    revalidateCheckoutPaths();
  }

  return {
    outcome: payment.status === 4 ? "canceled" : "rejected",
    orderId: order.id,
    flowOrder: payment.flowOrder,
    amount: paidAmount,
    message:
      payment.status === 4
        ? "El pago fue anulado."
        : "El pago fue rechazado. Puedes intentar de nuevo desde tu carrito.",
  };
}

export function getFlowCheckoutUrls() {
  return {
    confirmation: flowConfirmationUrl(),
    return: flowReturnUrl(),
    site: getSiteBaseUrl(),
    publicSite: getFlowPublicBaseUrl(),
  };
}
