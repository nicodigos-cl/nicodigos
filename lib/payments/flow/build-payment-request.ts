import {
  flowConfirmationUrl,
  flowReturnUrl,
} from "@/lib/payments/flow/config";

type BuildFlowPaymentInput = {
  commerceOrder: string;
  subject: string;
  amount: number;
  email: string;
};

type FlowPaymentCreatePayload = {
  commerceOrder: string;
  subject: string;
  amount: number;
  email: string;
  currency?: string;
  urlConfirmation: string;
  urlReturn: string;
  timeout?: number;
};

/**
 * Payload alineado con flowcl-pagos (~/flowcl-pagos).
 * - commerceOrder: ID único del pedido (usado luego en confirmación vía status.byToken).
 * - paymentMethod por defecto en el SDK: 9 (todos los medios).
 * - optional: si se usa, debe ir como objeto; el SDK lo serializa a JSON.
 */
export function buildFlowPaymentRequest(
  input: BuildFlowPaymentInput,
): FlowPaymentCreatePayload {
  return {
    commerceOrder: input.commerceOrder,
    subject: input.subject,
    amount: input.amount,
    email: input.email,
    currency: "CLP",
    urlConfirmation: flowConfirmationUrl(),
    urlReturn: flowReturnUrl(),
    timeout: 3600,
  };
}
