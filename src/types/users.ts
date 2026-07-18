import type {
  InvoiceDocumentType,
  UserAccountStatus,
  UserAdminEventType,
  UserAdminNoteCategory,
  UserAdminNotePriority,
  UserRole,
} from "@/generated/prisma/enums";
import type { UserReviewIssue } from "@/lib/users/review";

export type DerivedUserStatus =
  | "ACTIVE"
  | "UNVERIFIED"
  | "RESTRICTED"
  | "SUSPENDED"
  | "ANONYMIZED"
  | "NEEDS_REVIEW";

export type UserListItemDto = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: UserRole;
  accountStatus: UserAccountStatus;
  derivedStatus: DerivedUserStatus;
  emailVerified: boolean;
  hasPassword: boolean;
  orderCount: number;
  totalSpent: number;
  currency: string;
  lastActivityAt: string | null;
  createdAt: string;
  requiresReview: boolean;
  isEnvAdmin: boolean;
};

export type UserMetricsDto = {
  total: number;
  newInPeriod: number;
  withOrders: number;
  withCompletedPurchases: number;
  admins: number;
  blockedOrRestricted: number;
  recentlyActive: number;
  needsReview: number;
  scope: "global" | "filtered";
  periodFrom: string | null;
  periodTo: string | null;
};

export type UserCommerceSummaryDto = {
  orderCount: number;
  paidOrderCount: number;
  totalSpent: number;
  currency: string;
  transactionCount: number;
  deliveryCount: number;
  refundCount: number;
  refundAmount: number;
  firstPurchaseAt: string | null;
  lastPurchaseAt: string | null;
  pendingOrderCount: number;
  pendingDeliveryCount: number;
  recentFailedPaymentCount: number;
  activeNoteCount: number;
};

export type UserOrderRowDto = {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  currency: string;
  createdAt: string;
  itemsCount: number;
  paymentStatus: string | null;
  deliveryStatuses: string[];
};

export type UserTransactionRowDto = {
  id: string;
  provider: string;
  status: string;
  amount: number;
  currency: string;
  orderId: string;
  orderNumber: string;
  createdAt: string;
  externalReference: string | null;
};

export type UserDeliveryRowDto = {
  id: string;
  productName: string;
  orderId: string;
  orderNumber: string;
  method: string;
  status: string;
  createdAt: string;
  externalReference: string | null;
};

export type UserSessionRowDto = {
  id: string;
  userAgentSummary: string;
  ipMasked: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  isExpired: boolean;
};

export type UserAccountProviderDto = {
  id: string;
  providerId: string;
  accountIdMasked: string;
  hasPassword: boolean;
  createdAt: string;
};

export type UserAdminNoteDto = {
  id: string;
  category: UserAdminNoteCategory;
  priority: UserAdminNotePriority;
  content: string;
  authorEmail: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UserTimelineEventDto = {
  id: string;
  source: "admin" | "order" | "payment" | "delivery" | "session" | "account";
  type: string;
  message: string;
  createdAt: string;
  href?: string;
};

export type UserBillingDto = {
  rut: string | null;
  rutValid: boolean | null;
  invoiceType: InvoiceDocumentType;
  businessName: string | null;
  businessActivity: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  commune: string | null;
  city: string | null;
  region: string | null;
  phone: string | null;
  completeness: "complete" | "partial" | "incomplete";
};

export type UserDetailDto = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: UserRole;
  accountStatus: UserAccountStatus;
  derivedStatus: DerivedUserStatus;
  emailVerified: boolean;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string | null;
  requiresReview: boolean;
  reviewReason: string | null;
  suspensionReason: string | null;
  suspendedAt: string | null;
  suspensionEndsAt: string | null;
  anonymizedAt: string | null;
  isEnvAdmin: boolean;
  activeSessionCount: number;
  lastSessionAt: string | null;
  commerce: UserCommerceSummaryDto;
  billing: UserBillingDto;
  issues: UserReviewIssue[];
  providers: UserAccountProviderDto[];
  sessions: UserSessionRowDto[];
  notes: UserAdminNoteDto[];
  timeline: UserTimelineEventDto[];
  orders: UserOrderRowDto[];
  transactions: UserTransactionRowDto[];
  deliveries: UserDeliveryRowDto[];
  adminEventTypes: UserAdminEventType[];
};
