import "server-only";

import type { Payment } from "@/generated/prisma/client";
import { getFlowClient } from "@/lib/flow/client";
import { mapFlowStatus, normalizeFlowAmount } from "@/lib/transactions/status";

export type ProviderPaymentSnapshot = {
  status: ReturnType<typeof mapFlowStatus>;
  providerStatus: string;
  flowOrder: number;
  commerceOrder: string;
  amount: number;
  currency: string;
  payerEmail: string;
  paymentMethod: string | null;
  paidAt: Date | null;
};

function parseFlowDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value.replace(" ", "T"));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function getProviderPaymentSnapshot(payment: Pick<Payment, "provider" | "externalId" | "flowOrder" | "commerceOrder" | "orderId">): Promise<ProviderPaymentSnapshot> {
  if (payment.provider !== "FLOW") throw new Error("Este proveedor no admite consulta automática de estado.");
  const flow = getFlowClient();
  const response = payment.externalId
    ? await flow.payments.status.byToken(payment.externalId)
    : payment.flowOrder
      ? await flow.payments.status.byFlowOrderNumber(payment.flowOrder)
      : await flow.payments.status.byCommerceId(payment.commerceOrder ?? payment.orderId);
  return { status: mapFlowStatus(response.status), providerStatus: response.statusStr, flowOrder: response.flowOrder, commerceOrder: response.commerceOrder, amount: normalizeFlowAmount(response.amount), currency: response.currency, payerEmail: response.payer, paymentMethod: response.paymentData?.media ?? null, paidAt: parseFlowDate(response.paymentData?.date) };
}

export function sanitizeProviderError(error: unknown): { message: string; code: string } {
  const candidate = error as { name?: unknown; statusCode?: unknown };
  const code = typeof candidate.statusCode === "number" ? `FLOW_HTTP_${candidate.statusCode}` : typeof candidate.name === "string" ? candidate.name.slice(0, 80) : "FLOW_ERROR";
  return { code, message: "Flow no pudo completar la operación. Reintenta o revisa el estado del proveedor." };
}
