import type { PaymentStatus } from "@/lib/validations/orders";
import type { CustomerStatusTone } from "@/lib/customer-dashboard/status-tone";
import { getCustomerPaymentStatusView } from "@/lib/customer-dashboard/status";

export type CustomerPaymentInput = {
  id: string;
  status: PaymentStatus;
  amount: string;
  currency: string;
  provider: string | null;
  paymentMethod: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CustomerPaymentState = {
  status: PaymentStatus | null;
  statusView: ReturnType<typeof getCustomerPaymentStatusView> | null;
  /** Approved payment if any; otherwise the most recent attempt. */
  relevantPayment: CustomerPaymentInput | null;
  hasApprovedPayment: boolean;
  hasPendingPayment: boolean;
  hasFailedAttempt: boolean;
  canPay: boolean;
  canRetry: boolean;
  label: string;
  tone: CustomerStatusTone;
};

const APPROVED: ReadonlySet<PaymentStatus> = new Set(["PAID"]);
const PENDING_LIKE: ReadonlySet<PaymentStatus> = new Set([
  "PENDING",
  "PROCESSING",
]);
const FAILED_LIKE: ReadonlySet<PaymentStatus> = new Set([
  "FAILED",
  "REJECTED",
  "EXPIRED",
]);
const TERMINAL_BLOCK: ReadonlySet<PaymentStatus> = new Set([
  "REFUNDED",
  "PARTIALLY_REFUNDED",
  "CANCELLED",
]);

/**
 * Derives a single customer-facing payment summary from multiple attempts.
 * Prioritizes an approved payment over newer failed/pending attempts.
 */
export function deriveCustomerPaymentSummary(
  payments: CustomerPaymentInput[],
): CustomerPaymentState {
  if (payments.length === 0) {
    return {
      status: null,
      statusView: null,
      relevantPayment: null,
      hasApprovedPayment: false,
      hasPendingPayment: false,
      hasFailedAttempt: false,
      canPay: true,
      canRetry: false,
      label: "Sin pago",
      tone: "neutral",
    };
  }

  const sorted = [...payments].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const approved = sorted.find((p) => APPROVED.has(p.status)) ?? null;
  const pending = sorted.find((p) => PENDING_LIKE.has(p.status)) ?? null;
  const failed = sorted.find((p) => FAILED_LIKE.has(p.status)) ?? null;
  const relevant = approved ?? pending ?? sorted[0] ?? null;

  const status = relevant?.status ?? null;
  const statusView = status ? getCustomerPaymentStatusView(status) : null;
  const hasApprovedPayment = Boolean(approved);
  const hasPendingPayment = Boolean(pending) && !hasApprovedPayment;
  const hasFailedAttempt = Boolean(failed) && !hasApprovedPayment;

  const blocked =
    hasApprovedPayment ||
    (status != null && TERMINAL_BLOCK.has(status));

  return {
    status,
    statusView,
    relevantPayment: relevant,
    hasApprovedPayment,
    hasPendingPayment,
    hasFailedAttempt,
    canPay: !blocked && (status == null || FAILED_LIKE.has(status) || status === "PENDING"),
    canRetry: !blocked && hasFailedAttempt,
    label: statusView?.label ?? "Sin pago",
    tone: statusView?.tone ?? "neutral",
  };
}
