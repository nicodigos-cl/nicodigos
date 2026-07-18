import type {
  DeliveryContentType,
  DeliveryMethod,
  DeliveryStatus,
} from "@/lib/validations/deliveries";
import type { DeliveryAdminAction } from "@/lib/deliveries/status";

export type DeliveryListItemDto = {
  id: string;
  status: DeliveryStatus;
  deliveryMethod: DeliveryMethod;
  errorMessage: string | null;
  externalOrderId: string | null;
  externalStatus: string | null;
  keysCount: number;
  credentialsCount: number;
  progressSummary: string;
  needsManualAttention: boolean;
  orderId: string;
  orderEmail: string;
  customerName: string | null;
  userName: string;
  productId: string;
  productName: string;
  quantity: number;
  createdAt: string;
  updatedAt: string;
  deliveredAt: string | null;
};

export type DeliveriesPageResult = {
  items: DeliveryListItemDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type DeliveryMetricsDto = {
  pending: number;
  processing: number;
  delivered: number;
  failed: number;
  needsManual: number;
  scope: "filtered" | "global";
};

export type DeliveryKeyDto = {
  id: string;
  serialMasked: string;
  contentType: DeliveryContentType;
  type: string | null;
  label: string | null;
  instructions: string | null;
  isSecret: boolean;
  externalKeyId: string | null;
  productKeyId: string | null;
  createdAt: string;
};

export type DeliveryCredentialDto = {
  id: string;
  contentType: DeliveryContentType;
  label: string | null;
  username: string | null;
  email: string | null;
  passwordMasked: string | null;
  tokenMasked: string | null;
  url: string | null;
  notes: string | null;
  instructions: string | null;
  isSecret: boolean;
  hasPassword: boolean;
  hasToken: boolean;
  createdAt: string;
};

export type DeliveryEventDto = {
  id: string;
  status: DeliveryStatus;
  message: string | null;
  source: "SYSTEM" | "WEBHOOK" | "ADMIN";
  actorUserId: string | null;
  actorEmail: string | null;
  createdAt: string;
};

export type DeliverySmmDto = {
  link: string | null;
  username: string | null;
  quantity: number | null;
  comments: string | null;
  runs: number | null;
  intervalMinutes: number | null;
  usernames: string | null;
  hashtags: string | null;
  mediaUrl: string | null;
  min: number | null;
  max: number | null;
  delayMinutes: number | null;
  posts: number | null;
  oldPosts: number | null;
  expiry: string | null;
  answerNumber: string | null;
  remoteOrderId: string | null;
  remoteStatus: string | null;
  charge: string | null;
  currency: string | null;
  startCount: number | null;
  remains: number | null;
  refillId: string | null;
  lastSyncedAt: string | null;
  errorMessage: string | null;
};

export type DeliveryKinguinDto = {
  kinguinOrderId: string | null;
  orderExternalId: string | null;
  externalOrderId: string | null;
  externalStatus: string | null;
  requestPriceEur: string | null;
  lastSyncedAt: string | null;
  errorMessage: string | null;
  keys: DeliveryKeyDto[];
};

export type AvailableProductKeyDto = {
  id: string;
  codeMasked: string;
  createdAt: string;
};

export type DeliveryDetailDto = {
  id: string;
  status: DeliveryStatus;
  deliveryMethod: DeliveryMethod;
  errorMessage: string | null;
  customerMessage: string | null;
  deliveredAt: string | null;
  lastSyncedAt: string | null;
  externalOrderId: string | null;
  externalStatus: string | null;
  createdAt: string;
  updatedAt: string;
  allowedActions: DeliveryAdminAction[];
  order: {
    id: string;
    status: string;
    email: string;
    customerName: string | null;
    currency: string;
    total: string;
    userId: string;
    userName: string;
    userEmail: string;
    isPaid: boolean;
  };
  product: {
    id: string;
    name: string;
    slug: string | null;
    quantity: number;
    unitPrice: string;
    deliveryMethod: DeliveryMethod;
    hasKeyInventory: boolean;
  };
  keys: DeliveryKeyDto[];
  credentials: DeliveryCredentialDto[];
  events: DeliveryEventDto[];
  smm: DeliverySmmDto | null;
  kinguin: DeliveryKinguinDto | null;
  notifications: Array<{
    id: string;
    type: string;
    status: string;
    recipient: string;
    isResend: boolean;
    sentAt: string | null;
    errorMessage: string | null;
    createdAt: string;
  }>;
};

/** Safe payload for the authenticated order owner (no provider internals). */
export type CustomerDeliveryDto = {
  id: string;
  status: DeliveryStatus;
  deliveryMethod: DeliveryMethod;
  productName: string;
  quantity: number;
  customerMessage: string | null;
  deliveredAt: string | null;
  createdAt: string;
  keys: Array<{
    id: string;
    label: string | null;
    contentType: DeliveryContentType;
    serialMasked: string;
    instructions: string | null;
    isSecret: boolean;
  }>;
  credentials: Array<{
    id: string;
    label: string | null;
    contentType: DeliveryContentType;
    username: string | null;
    email: string | null;
    passwordMasked: string | null;
    tokenMasked: string | null;
    url: string | null;
    notes: string | null;
    instructions: string | null;
    isSecret: boolean;
    hasPassword: boolean;
    hasToken: boolean;
  }>;
  events: Array<{
    id: string;
    status: DeliveryStatus;
    message: string | null;
    createdAt: string;
  }>;
};
