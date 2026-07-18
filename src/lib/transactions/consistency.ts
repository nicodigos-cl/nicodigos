import type { OrderStatus, PaymentStatus } from "@/generated/prisma/enums";
import { isSuccessfulPaymentStatus } from "@/lib/transactions/status";

export type TransactionConsistencyIssue =
  | { type: "ORDER_NOT_MARKED_PAID"; severity: "high"; message: string }
  | { type: "ORDER_PAID_WITHOUT_APPROVED_PAYMENT"; severity: "critical"; message: string }
  | { type: "AMOUNT_MISMATCH"; severity: "critical"; message: string }
  | { type: "CURRENCY_MISMATCH"; severity: "critical"; message: string }
  | { type: "DELIVERY_NOT_STARTED"; severity: "medium"; message: string }
  | { type: "CANCELLED_ORDER_WITH_PAYMENT"; severity: "critical"; message: string }
  | { type: "MULTIPLE_APPROVED_PAYMENTS"; severity: "critical"; message: string }
  | { type: "LOCAL_PROVIDER_STATUS_MISMATCH"; severity: "high"; message: string }
  | { type: "REFUNDED_ORDER_ACTIVE"; severity: "high"; message: string }
  | { type: "DUPLICATE_PROVIDER_REFERENCE"; severity: "critical"; message: string }
  | { type: "WEBHOOK_NOT_PROCESSED"; severity: "high"; message: string }
  | { type: "CONFIRMATION_PROCESSED_MULTIPLE_TIMES"; severity: "medium"; message: string };

export type ConsistencyInput = {
  paymentStatus: PaymentStatus;
  providerStatus?: PaymentStatus | null;
  paymentAmount: number;
  paymentCurrency: string;
  orderStatus: OrderStatus;
  orderTotal: number;
  orderCurrency: string;
  deliveriesCount: number;
  approvedPaymentsCount: number;
  duplicateReferencesCount?: number;
  webhookReceived?: boolean;
  webhookProcessed?: boolean;
  processedConfirmations?: number;
};

export function detectTransactionConsistencyIssues(input: ConsistencyInput): TransactionConsistencyIssue[] {
  const issues: TransactionConsistencyIssue[] = [];
  const approved = isSuccessfulPaymentStatus(input.paymentStatus);
  const orderPaid = ["PAID", "PROCESSING", "FULFILLED", "PARTIALLY_FULFILLED", "REFUNDED"].includes(input.orderStatus);
  if (approved && !orderPaid) issues.push({ type: "ORDER_NOT_MARKED_PAID", severity: "high", message: "La transacción está aprobada, pero el pedido no figura pagado." });
  if (orderPaid && !approved && input.approvedPaymentsCount === 0) issues.push({ type: "ORDER_PAID_WITHOUT_APPROVED_PAYMENT", severity: "critical", message: "El pedido figura pagado sin una transacción aprobada." });
  if (input.paymentAmount !== input.orderTotal) issues.push({ type: "AMOUNT_MISMATCH", severity: "critical", message: "El monto de la transacción no coincide con el total del pedido." });
  if (input.paymentCurrency !== input.orderCurrency) issues.push({ type: "CURRENCY_MISMATCH", severity: "critical", message: "La moneda de la transacción no coincide con la del pedido." });
  if (approved && input.deliveriesCount === 0) issues.push({ type: "DELIVERY_NOT_STARTED", severity: "medium", message: "El pago está aprobado y aún no se inició la entrega." });
  if (approved && input.orderStatus === "CANCELED") issues.push({ type: "CANCELLED_ORDER_WITH_PAYMENT", severity: "critical", message: "El pedido está cancelado, pero conserva un pago aprobado." });
  if (input.approvedPaymentsCount > 1) issues.push({ type: "MULTIPLE_APPROVED_PAYMENTS", severity: "critical", message: "Existe más de una transacción exitosa para el pedido." });
  if (input.providerStatus && input.providerStatus !== input.paymentStatus) issues.push({ type: "LOCAL_PROVIDER_STATUS_MISMATCH", severity: "high", message: "El estado local difiere del estado informado por el proveedor." });
  if (input.paymentStatus === "REFUNDED" && input.orderStatus !== "REFUNDED" && input.orderStatus !== "CANCELED") issues.push({ type: "REFUNDED_ORDER_ACTIVE", severity: "high", message: "La transacción fue reembolsada, pero el pedido continúa activo." });
  if ((input.duplicateReferencesCount ?? 0) > 1) issues.push({ type: "DUPLICATE_PROVIDER_REFERENCE", severity: "critical", message: "La referencia del proveedor aparece en más de una transacción." });
  if (input.webhookReceived && !input.webhookProcessed) issues.push({ type: "WEBHOOK_NOT_PROCESSED", severity: "high", message: "Se recibió una confirmación que no terminó de procesarse." });
  if ((input.processedConfirmations ?? 0) > 1) issues.push({ type: "CONFIRMATION_PROCESSED_MULTIPLE_TIMES", severity: "medium", message: "La confirmación fue recibida varias veces; los efectos internos permanecen idempotentes." });
  return issues;
}
