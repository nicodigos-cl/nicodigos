import "server-only";

import type { Prisma, StoreSettings } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";
import type {
  SettingsChangeEntry,
  StoreSettingsDto,
} from "@/types/settings";

function decimalToNumber(
  value: { toString(): string } | null | undefined,
): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value.toString());
  return Number.isFinite(n) ? n : null;
}

export function toStoreSettingsDto(row: StoreSettings): StoreSettingsDto {
  return {
    id: row.id,
    version: row.version,
    updatedAt: row.updatedAt.toISOString(),

    storeName: row.storeName,
    legalName: row.legalName,
    shortDescription: row.shortDescription,
    supportEmail: row.supportEmail,
    senderName: row.senderName,
    replyToEmail: row.replyToEmail,
    primaryColor: row.primaryColor,
    timezone: row.timezone,
    locale: row.locale,
    country: row.country,
    defaultCurrency: row.defaultCurrency,
    logoUrl: row.logoUrl,
    faviconUrl: row.faviconUrl,

    storeStatus: row.storeStatus,
    showOutOfStock: row.showOutOfStock,
    allowPurchaseWithoutStock: row.allowPurchaseWithoutStock,
    pricesIncludeTax: row.pricesIncludeTax,
    minOrderAmount: decimalToNumber(row.minOrderAmount),
    maxOrderAmount: decimalToNumber(row.maxOrderAmount),
    maxQuantityPerProduct: row.maxQuantityPerProduct,
    maxProductsPerOrder: row.maxProductsPerOrder,
    supportVisible: row.supportVisible,
    availabilityMessage: row.availabilityMessage,

    checkoutEnabled: row.checkoutEnabled,
    requireVerifiedEmail: row.requireVerifiedEmail,
    requireRut: row.requireRut,
    requireBillingData: row.requireBillingData,
    allowBoleta: row.allowBoleta,
    allowFactura: row.allowFactura,
    orderExpirationMinutes: row.orderExpirationMinutes,
    paymentExpirationMinutes: row.paymentExpirationMinutes,
    requireTermsAcceptance: row.requireTermsAcceptance,
    termsUrl: row.termsUrl,
    privacyUrl: row.privacyUrl,
    maxPaymentAttempts: row.maxPaymentAttempts,
    reusePendingPaymentIntent: row.reusePendingPaymentIntent,
    preventDuplicateOrders: row.preventDuplicateOrders,

    flowEnabled: row.flowEnabled,
    acceptedCurrency: row.acceptedCurrency,
    refundsEnabled: row.refundsEnabled,
    minPaymentAmount: decimalToNumber(row.minPaymentAmount),
    maxPaymentAmount: decimalToNumber(row.maxPaymentAmount),
    commerceOrderPrefix: row.commerceOrderPrefix,
    strictAmountValidation: row.strictAmountValidation,
    strictCurrencyValidation: row.strictCurrencyValidation,

    automaticDeliveryEnabled: row.automaticDeliveryEnabled,
    manualDeliveryEnabled: row.manualDeliveryEnabled,
    autoSendAfterPayment: row.autoSendAfterPayment,
    deliveryRetryMax: row.deliveryRetryMax,
    deliveryRetryIntervalMinutes: row.deliveryRetryIntervalMinutes,
    allowPartialDeliveries: row.allowPartialDeliveries,
    allowEmailResend: row.allowEmailResend,
    requireRecentSessionForCredentials: row.requireRecentSessionForCredentials,
    sensitiveLinkExpirationMinutes: row.sensitiveLinkExpirationMinutes,
    hideCredentialsByDefault: row.hideCredentialsByDefault,

    keysAutoAssign: row.keysAutoAssign,
    keysReserveDuringCheckout: row.keysReserveDuringCheckout,
    keysReserveDurationMinutes: row.keysReserveDurationMinutes,
    keysLowStockThreshold: row.keysLowStockThreshold,
    keysStockAlertsEnabled: row.keysStockAlertsEnabled,
    keysAllowManualReplace: row.keysAllowManualReplace,

    accountsAutoAssign: row.accountsAutoAssign,
    accountsRequireRecentSession: row.accountsRequireRecentSession,
    accountsHideCredentials: row.accountsHideCredentials,
    accountsAllowReplace: row.accountsAllowReplace,

    smmAutoSend: row.smmAutoSend,
    smmManualSend: row.smmManualSend,
    smmMaxRetries: row.smmMaxRetries,
    smmAllowPartials: row.smmAllowPartials,
    smmValidateUrl: row.smmValidateUrl,
    smmStuckAlertMinutes: row.smmStuckAlertMinutes,

    resendEnabled: row.resendEnabled,
    transactionalEmailsEnabled: row.transactionalEmailsEnabled,
    adminEmailsEnabled: row.adminEmailsEnabled,
    emailOrderCreated: row.emailOrderCreated,
    emailPaymentApproved: row.emailPaymentApproved,
    emailPaymentRejected: row.emailPaymentRejected,
    emailDeliveryAvailable: row.emailDeliveryAvailable,
    emailDeliveryFailed: row.emailDeliveryFailed,
    emailPasswordReset: row.emailPasswordReset,
    emailEmailVerification: row.emailEmailVerification,

    requireEmailVerifiedForCheckout: row.requireEmailVerifiedForCheckout,
    reauthForCredentialReveal: row.reauthForCredentialReveal,
    auditSettingsChanges: row.auditSettingsChanges,

    maintenanceMessage: row.maintenanceMessage,
    estimatedReturnAt: row.estimatedReturnAt?.toISOString() ?? null,
    allowAdminDuringMaintenance: row.allowAdminDuringMaintenance,
    allowWebhooksDuringMaintenance: row.allowWebhooksDuringMaintenance,
    allowJobsDuringMaintenance: row.allowJobsDuringMaintenance,
    allowOngoingDeliveriesDuringMaintenance:
      row.allowOngoingDeliveriesDuringMaintenance,

    notifyPaymentFailed: row.notifyPaymentFailed,
    notifyPaymentInconsistent: row.notifyPaymentInconsistent,
    notifyDeliveryFailed: row.notifyDeliveryFailed,
    notifyPaidWithoutDelivery: row.notifyPaidWithoutDelivery,
    notifyLowStock: row.notifyLowStock,
    notifyOutOfStock: row.notifyOutOfStock,
    notifySmmStuck: row.notifySmmStuck,
    notifyProviderError: row.notifyProviderError,
    notifyWebhookFailed: row.notifyWebhookFailed,
    notifyHighValueSale: row.notifyHighValueSale,
    highValueSaleThreshold: decimalToNumber(row.highValueSaleThreshold),
    adminNotificationEmails: row.adminNotificationEmails,
  };
}

export async function ensureStoreSettings(): Promise<StoreSettings> {
  const existing = await prisma.storeSettings.findUnique({
    where: { id: "default" },
  });
  if (existing) return existing;

  return prisma.storeSettings.create({
    data: { id: "default" },
  });
}

export async function getStoreSettings(): Promise<StoreSettingsDto> {
  const row = await ensureStoreSettings();
  return toStoreSettingsDto(row);
}

export async function getStoreSettingsRow(): Promise<StoreSettings> {
  return ensureStoreSettings();
}

export function buildSettingsChanges(
  previous: StoreSettings,
  next: Partial<StoreSettings>,
  keys: readonly string[],
): SettingsChangeEntry[] {
  const changes: SettingsChangeEntry[] = [];
  for (const key of keys) {
    const fromRaw = previous[key as keyof StoreSettings];
    const toRaw = next[key as keyof StoreSettings];
    if (toRaw === undefined) continue;
    const from = sanitizeScalar(fromRaw);
    const to = sanitizeScalar(toRaw);
    if (from === to) continue;
    changes.push({ key, from, to });
  }
  return changes;
}

function sanitizeScalar(
  value: unknown,
): string | number | boolean | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (
    typeof value === "object" &&
    value !== null &&
    "toString" in value &&
    typeof value.toString === "function"
  ) {
    return value.toString();
  }
  return String(value);
}

export function toDecimalInput(
  value: number | null | undefined,
): Prisma.Decimal | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return value as unknown as Prisma.Decimal;
}
