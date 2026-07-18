import type { StoreStatus } from "@/generated/prisma/client";

export type SettingsChangeEntry = {
  key: string;
  from: string | number | boolean | null;
  to: string | number | boolean | null;
};

export type StoreSettingsDto = {
  id: string;
  version: number;
  updatedAt: string;

  storeName: string;
  legalName: string | null;
  shortDescription: string | null;
  supportEmail: string;
  senderName: string;
  replyToEmail: string | null;
  primaryColor: string;
  timezone: string;
  locale: string;
  country: string;
  defaultCurrency: string;
  logoUrl: string | null;
  faviconUrl: string | null;

  storeStatus: StoreStatus;
  showOutOfStock: boolean;
  allowPurchaseWithoutStock: boolean;
  pricesIncludeTax: boolean;
  minOrderAmount: number | null;
  maxOrderAmount: number | null;
  maxQuantityPerProduct: number;
  maxProductsPerOrder: number;
  supportVisible: boolean;
  availabilityMessage: string | null;

  checkoutEnabled: boolean;
  requireVerifiedEmail: boolean;
  requireRut: boolean;
  requireBillingData: boolean;
  allowBoleta: boolean;
  allowFactura: boolean;
  orderExpirationMinutes: number;
  paymentExpirationMinutes: number;
  requireTermsAcceptance: boolean;
  termsUrl: string | null;
  privacyUrl: string | null;
  maxPaymentAttempts: number;
  reusePendingPaymentIntent: boolean;
  preventDuplicateOrders: boolean;

  flowEnabled: boolean;
  acceptedCurrency: string;
  refundsEnabled: boolean;
  minPaymentAmount: number | null;
  maxPaymentAmount: number | null;
  commerceOrderPrefix: string;
  strictAmountValidation: boolean;
  strictCurrencyValidation: boolean;

  automaticDeliveryEnabled: boolean;
  manualDeliveryEnabled: boolean;
  autoSendAfterPayment: boolean;
  deliveryRetryMax: number;
  deliveryRetryIntervalMinutes: number;
  allowPartialDeliveries: boolean;
  allowEmailResend: boolean;
  requireRecentSessionForCredentials: boolean;
  sensitiveLinkExpirationMinutes: number;
  hideCredentialsByDefault: boolean;

  keysAutoAssign: boolean;
  keysReserveDuringCheckout: boolean;
  keysReserveDurationMinutes: number;
  keysLowStockThreshold: number;
  keysStockAlertsEnabled: boolean;
  keysAllowManualReplace: boolean;

  accountsAutoAssign: boolean;
  accountsRequireRecentSession: boolean;
  accountsHideCredentials: boolean;
  accountsAllowReplace: boolean;

  smmAutoSend: boolean;
  smmManualSend: boolean;
  smmMaxRetries: number;
  smmAllowPartials: boolean;
  smmValidateUrl: boolean;
  smmStuckAlertMinutes: number;

  resendEnabled: boolean;
  transactionalEmailsEnabled: boolean;
  adminEmailsEnabled: boolean;
  emailOrderCreated: boolean;
  emailPaymentApproved: boolean;
  emailPaymentRejected: boolean;
  emailDeliveryAvailable: boolean;
  emailDeliveryFailed: boolean;
  emailPasswordReset: boolean;
  emailEmailVerification: boolean;

  requireEmailVerifiedForCheckout: boolean;
  reauthForCredentialReveal: boolean;
  auditSettingsChanges: boolean;

  maintenanceMessage: string | null;
  estimatedReturnAt: string | null;
  allowAdminDuringMaintenance: boolean;
  allowWebhooksDuringMaintenance: boolean;
  allowJobsDuringMaintenance: boolean;
  allowOngoingDeliveriesDuringMaintenance: boolean;

  notifyPaymentFailed: boolean;
  notifyPaymentInconsistent: boolean;
  notifyDeliveryFailed: boolean;
  notifyPaidWithoutDelivery: boolean;
  notifyLowStock: boolean;
  notifyOutOfStock: boolean;
  notifySmmStuck: boolean;
  notifyProviderError: boolean;
  notifyWebhookFailed: boolean;
  notifyHighValueSale: boolean;
  highValueSaleThreshold: number | null;
  adminNotificationEmails: string | null;
};

export type IntegrationStatus =
  | "connected"
  | "configured"
  | "missing"
  | "error"
  | "disabled";

export type IntegrationStatusCard = {
  id: string;
  name: string;
  description: string;
  status: IntegrationStatus;
  environment: string | null;
  lastCheckedAt: string | null;
  error: string | null;
  detail: string | null;
  configureHref: string;
  secretHint: string | null;
  editable: boolean;
};

export type WebhookStatusCard = {
  id: string;
  name: string;
  publicUrl: string;
  events: string[];
  signatureVerified: boolean;
  idempotent: boolean;
  notes: string;
};

export type CronJobStatus = {
  id: string;
  name: string;
  route: string;
  configuredVia: "infrastructure";
  description: string;
};

export type SettingsHistoryItem = {
  id: string;
  section: string;
  action: string;
  actorEmail: string | null;
  message: string | null;
  result: string;
  changes: SettingsChangeEntry[] | null;
  createdAt: string;
};

export type AdminSettingsOverview = {
  settings: StoreSettingsDto;
  integrations: IntegrationStatusCard[];
  webhooks: WebhookStatusCard[];
  crons: CronJobStatus[];
  warnings: string[];
  adminCount: number;
  envAdminCount: number;
  pendingConfig: string[];
};
