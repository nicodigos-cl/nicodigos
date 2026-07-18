import { PaymentStatus } from "@/generated/prisma/enums";

const transitions: Record<PaymentStatus, readonly PaymentStatus[]> = {
  PENDING: ["PROCESSING", "PAID", "FAILED", "REJECTED", "CANCELLED", "EXPIRED"],
  PROCESSING: ["PENDING", "PAID", "FAILED", "REJECTED", "CANCELLED", "EXPIRED"],
  PAID: ["PARTIALLY_REFUNDED", "REFUNDED"],
  FAILED: ["PENDING"],
  REJECTED: ["PENDING"],
  CANCELLED: [],
  EXPIRED: [],
  PARTIALLY_REFUNDED: ["PARTIALLY_REFUNDED", "REFUNDED"],
  REFUNDED: [],
};

export function canTransitionPaymentStatus(
  currentStatus: PaymentStatus,
  nextStatus: PaymentStatus,
): boolean {
  return currentStatus === nextStatus || transitions[currentStatus].includes(nextStatus);
}

export function mapFlowStatus(status: 1 | 2 | 3 | 4): PaymentStatus {
  if (status === 1) return PaymentStatus.PENDING;
  if (status === 2) return PaymentStatus.PAID;
  if (status === 3) return PaymentStatus.REJECTED;
  return PaymentStatus.CANCELLED;
}

export function isSuccessfulPaymentStatus(status: PaymentStatus): boolean {
  return status === PaymentStatus.PAID || status === PaymentStatus.PARTIALLY_REFUNDED || status === PaymentStatus.REFUNDED;
}
