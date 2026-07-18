import type { PaymentEventResult, PaymentEventSource, PaymentEventType, PaymentProvider, PaymentRefundStatus, PaymentReviewPriority, PaymentStatus } from "@/generated/prisma/enums";
import type { TransactionConsistencyIssue } from "@/lib/transactions/consistency";

export type TransactionListItemDto = {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string | null;
  customerEmail: string;
  provider: PaymentProvider;
  status: PaymentStatus;
  type: "PAYMENT" | "REFUND";
  amount: number;
  currency: string;
  paymentMethod: string | null;
  externalReference: string | null;
  flowOrder: number | null;
  createdAt: string;
  updatedAt: string;
  confirmedAt: string | null;
  requiresReview: boolean;
  hasError: boolean;
  consistencyIssueCount: number;
};

export type TransactionMetricsDto = {
  total: number;
  pending: number;
  approved: number;
  failed: number;
  refunded: number;
  approvedAmount: number;
  refundedAmount: number;
  requiresReview: number;
  currency: string;
  scope: "global" | "filtered";
};

export type TransactionEventDto = {
  id: string;
  type: PaymentEventType;
  source: PaymentEventSource;
  result: PaymentEventResult;
  statusBefore: PaymentStatus | null;
  statusAfter: PaymentStatus | null;
  message: string | null;
  actorEmail: string | null;
  createdAt: string;
};

export type TransactionRefundDto = {
  id: string;
  amount: number;
  currency: string;
  reason: string;
  status: PaymentRefundStatus;
  flowRefundOrder: string | null;
  requestedAt: string;
  completedAt: string | null;
};

export type TransactionDetailDto = {
  id: string;
  provider: PaymentProvider;
  status: PaymentStatus;
  amount: number;
  currency: string;
  externalReference: string | null;
  flowOrder: number | null;
  commerceOrder: string | null;
  paymentMethod: string | null;
  payerEmail: string | null;
  providerStatus: string | null;
  paidAt: string | null;
  expiresAt: string | null;
  confirmedAt: string | null;
  lastProviderCheckAt: string | null;
  refundAmount: number;
  failureCode: string | null;
  failureMessage: string | null;
  safeMetadata: Record<string, string | number | boolean | null> | null;
  requiresReview: boolean;
  reviewPriority: PaymentReviewPriority | null;
  reviewReason: string | null;
  reviewNote: string | null;
  reviewActorEmail: string | null;
  reviewCreatedAt: string | null;
  reviewResolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  order: {
    id: string; status: string; customerName: string | null; email: string; total: number; currency: string; createdAt: string; itemsCount: number; deliveriesCount: number; deliveryStatuses: string[];
  };
  approvedPaymentsCount: number;
  issues: TransactionConsistencyIssue[];
  events: TransactionEventDto[];
  refunds: TransactionRefundDto[];
};
