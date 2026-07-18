import { z } from "zod";

const hexColorRegex = /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/;
const currencyRegex = /^[A-Z]{3}$/;
const localeRegex = /^[a-z]{2}(-[A-Z]{2})?$/;
const countryRegex = /^[A-Z]{2}$/;

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .optional()
  .nullable()
  .transform((v) => (v === "" || v === undefined ? null : v))
  .refine(
    (v) => {
      if (v === null) return true;
      try {
        const url = new URL(v);
        if (url.protocol === "https:") return true;
        if (
          url.protocol === "http:" &&
          (url.hostname === "localhost" || url.hostname === "127.0.0.1")
        ) {
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    { message: "URL inválida. Usa https (o http solo en localhost)." },
  );

const emailField = z
  .string()
  .trim()
  .email("Email inválido")
  .max(255);

const optionalEmail = z
  .string()
  .trim()
  .max(255)
  .optional()
  .nullable()
  .transform((v) => (v === "" || v === undefined ? null : v))
  .refine((v) => v === null || z.string().email().safeParse(v).success, {
    message: "Email inválido",
  });

const optionalDecimal = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : Number.NaN;
}, z.number().nonnegative().nullable());

const positiveInt = (min: number, max: number) =>
  z.coerce.number().int().min(min).max(max);

const versionField = z.coerce.number().int().positive();

export const generalSettingsSchema = z.object({
  version: versionField,
  storeName: z.string().trim().min(2).max(80),
  legalName: z
    .string()
    .trim()
    .max(160)
    .optional()
    .nullable()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  shortDescription: z
    .string()
    .trim()
    .max(280)
    .optional()
    .nullable()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  supportEmail: emailField,
  senderName: z.string().trim().min(2).max(80),
  replyToEmail: optionalEmail,
  primaryColor: z
    .string()
    .trim()
    .regex(hexColorRegex, "Color hex inválido (#RRGGBB)"),
  timezone: z.string().trim().min(3).max(64),
  locale: z.string().trim().regex(localeRegex, "Locale inválido (ej. es)"),
  country: z.string().trim().regex(countryRegex, "Código de país ISO (CL)"),
  defaultCurrency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(currencyRegex, "Moneda ISO 4217 (CLP)"),
  logoUrl: optionalUrl,
  faviconUrl: optionalUrl,
});

export const storeSettingsSchema = z.object({
  version: versionField,
  storeStatus: z.enum(["OPEN", "READ_ONLY", "MAINTENANCE", "CLOSED"]),
  showOutOfStock: z.boolean(),
  allowPurchaseWithoutStock: z.boolean(),
  pricesIncludeTax: z.boolean(),
  minOrderAmount: optionalDecimal,
  maxOrderAmount: optionalDecimal,
  maxQuantityPerProduct: positiveInt(1, 9999),
  maxProductsPerOrder: positiveInt(1, 500),
  supportVisible: z.boolean(),
  availabilityMessage: z
    .string()
    .trim()
    .max(280)
    .optional()
    .nullable()
    .transform((v) => (v === "" || v === undefined ? null : v)),
}).superRefine((data, ctx) => {
  if (
    data.minOrderAmount !== null &&
    data.maxOrderAmount !== null &&
    data.minOrderAmount > data.maxOrderAmount
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["maxOrderAmount"],
      message: "El máximo debe ser mayor o igual al mínimo.",
    });
  }
  if (data.allowPurchaseWithoutStock && !data.showOutOfStock) {
    ctx.addIssue({
      code: "custom",
      path: ["allowPurchaseWithoutStock"],
      message: "No puedes vender sin stock si ocultas productos agotados.",
    });
  }
});

export const checkoutSettingsSchema = z.object({
  version: versionField,
  checkoutEnabled: z.boolean(),
  requireVerifiedEmail: z.boolean(),
  requireRut: z.boolean(),
  requireBillingData: z.boolean(),
  allowBoleta: z.boolean(),
  allowFactura: z.boolean(),
  orderExpirationMinutes: positiveInt(5, 10080),
  paymentExpirationMinutes: positiveInt(5, 10080),
  requireTermsAcceptance: z.boolean(),
  termsUrl: optionalUrl,
  privacyUrl: optionalUrl,
  maxPaymentAttempts: positiveInt(1, 20),
  reusePendingPaymentIntent: z.boolean(),
  preventDuplicateOrders: z.boolean(),
  confirmation: z.string().optional(),
}).superRefine((data, ctx) => {
  if (!data.allowBoleta && !data.allowFactura) {
    ctx.addIssue({
      code: "custom",
      path: ["allowBoleta"],
      message: "Debes permitir al menos un tipo de documento.",
    });
  }
  if (data.allowFactura && !data.requireBillingData) {
    ctx.addIssue({
      code: "custom",
      path: ["requireBillingData"],
      message: "La factura requiere datos de facturación.",
    });
  }
  if (data.requireTermsAcceptance && !data.termsUrl) {
    ctx.addIssue({
      code: "custom",
      path: ["termsUrl"],
      message: "Indica la URL de términos si exiges aceptación.",
    });
  }
  });

export const paymentSettingsSchema = z.object({
  version: versionField,
  flowEnabled: z.boolean(),
  acceptedCurrency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(currencyRegex),
  refundsEnabled: z.boolean(),
  minPaymentAmount: optionalDecimal,
  maxPaymentAmount: optionalDecimal,
  commerceOrderPrefix: z.string().trim().max(20),
  strictAmountValidation: z.boolean(),
  strictCurrencyValidation: z.boolean(),
  confirmation: z.string().optional(),
}).superRefine((data, ctx) => {
  if (
    data.minPaymentAmount !== null &&
    data.maxPaymentAmount !== null &&
    data.minPaymentAmount > data.maxPaymentAmount
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["maxPaymentAmount"],
      message: "El máximo debe ser mayor o igual al mínimo.",
    });
  }
});

export const deliverySettingsSchema = z.object({
  version: versionField,
  automaticDeliveryEnabled: z.boolean(),
  manualDeliveryEnabled: z.boolean(),
  autoSendAfterPayment: z.boolean(),
  deliveryRetryMax: positiveInt(0, 20),
  deliveryRetryIntervalMinutes: positiveInt(1, 1440),
  allowPartialDeliveries: z.boolean(),
  allowEmailResend: z.boolean(),
  requireRecentSessionForCredentials: z.boolean(),
  sensitiveLinkExpirationMinutes: positiveInt(5, 10080),
  hideCredentialsByDefault: z.boolean(),
  keysAutoAssign: z.boolean(),
  keysReserveDuringCheckout: z.boolean(),
  keysReserveDurationMinutes: positiveInt(1, 1440),
  keysLowStockThreshold: positiveInt(0, 10000),
  keysStockAlertsEnabled: z.boolean(),
  keysAllowManualReplace: z.boolean(),
  accountsAutoAssign: z.boolean(),
  accountsRequireRecentSession: z.boolean(),
  accountsHideCredentials: z.boolean(),
  accountsAllowReplace: z.boolean(),
  smmAutoSend: z.boolean(),
  smmManualSend: z.boolean(),
  smmMaxRetries: positiveInt(0, 20),
  smmAllowPartials: z.boolean(),
  smmValidateUrl: z.boolean(),
  smmStuckAlertMinutes: positiveInt(15, 10080),
  confirmation: z.string().optional(),
}).superRefine((data, ctx) => {
  if (
    !data.automaticDeliveryEnabled &&
    !data.manualDeliveryEnabled
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["manualDeliveryEnabled"],
      message: "Debes mantener al menos un modo de entrega.",
    });
  }
  if (data.smmAutoSend && !data.smmManualSend && !data.automaticDeliveryEnabled) {
    ctx.addIssue({
      code: "custom",
      path: ["smmAutoSend"],
      message: "El envío automático SMM requiere entregas automáticas.",
    });
  }
});

export const emailSettingsSchema = z.object({
  version: versionField,
  resendEnabled: z.boolean(),
  replyToEmail: optionalEmail,
  transactionalEmailsEnabled: z.boolean(),
  adminEmailsEnabled: z.boolean(),
  emailOrderCreated: z.boolean(),
  emailPaymentApproved: z.boolean(),
  emailPaymentRejected: z.boolean(),
  emailDeliveryAvailable: z.boolean(),
  emailDeliveryFailed: z.boolean(),
  emailPasswordReset: z.boolean(),
  emailEmailVerification: z.boolean(),
  confirmation: z.string().optional(),
});

export const securitySettingsSchema = z.object({
  version: versionField,
  requireEmailVerifiedForCheckout: z.boolean(),
  reauthForCredentialReveal: z.boolean(),
  auditSettingsChanges: z.boolean(),
});

export const maintenanceSettingsSchema = z.object({
  version: versionField,
  storeStatus: z.enum(["OPEN", "READ_ONLY", "MAINTENANCE", "CLOSED"]),
  maintenanceMessage: z
    .string()
    .trim()
    .max(280)
    .optional()
    .nullable()
    .transform((v) => (v === "" || v === undefined ? null : v))
    .refine((v) => v === null || !/[<>]/.test(v), {
      message: "No se permite HTML en el mensaje.",
    }),
  estimatedReturnAt: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v === "" || v === undefined ? null : v))
    .refine((v) => v === null || !Number.isNaN(Date.parse(v)), {
      message: "Fecha inválida",
    }),
  allowAdminDuringMaintenance: z.boolean(),
  allowWebhooksDuringMaintenance: z.boolean(),
  allowJobsDuringMaintenance: z.boolean(),
  allowOngoingDeliveriesDuringMaintenance: z.boolean(),
  // Limits & notifications bundled in maintenance section UI
  maxQuantityPerProduct: positiveInt(1, 9999),
  maxProductsPerOrder: positiveInt(1, 500),
  maxPaymentAttempts: positiveInt(1, 20),
  deliveryRetryMax: positiveInt(0, 20),
  keysLowStockThreshold: positiveInt(0, 10000),
  notifyPaymentFailed: z.boolean(),
  notifyPaymentInconsistent: z.boolean(),
  notifyDeliveryFailed: z.boolean(),
  notifyPaidWithoutDelivery: z.boolean(),
  notifyLowStock: z.boolean(),
  notifyOutOfStock: z.boolean(),
  notifySmmStuck: z.boolean(),
  notifyProviderError: z.boolean(),
  notifyWebhookFailed: z.boolean(),
  notifyHighValueSale: z.boolean(),
  highValueSaleThreshold: optionalDecimal,
  adminNotificationEmails: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .nullable()
    .transform((v) => (v === "" || v === undefined ? null : v))
    .refine(
      (v) => {
        if (v === null) return true;
        return v.split(",").every((email) => {
          const trimmed = email.trim();
          return trimmed.length === 0 || z.string().email().safeParse(trimmed).success;
        });
      },
      { message: "Lista de emails inválida (separados por coma)." },
    ),
  confirmation: z.string().optional(),
});

export const toggleMaintenanceSchema = z.object({
  version: versionField,
  enable: z.boolean(),
  message: z.string().trim().max(280).optional().nullable(),
  confirmation: z.literal("ACTIVAR_MANTENIMIENTO").or(z.literal("DESACTIVAR_MANTENIMIENTO")),
});

export const sendTestEmailSchema = z.object({
  to: emailField,
  template: z.enum([
    "auth-otp",
    "delivery-completed",
    "delivery-failed",
    "delivery-processing",
    "order-lifecycle",
  ]),
});

export const testProviderConnectionSchema = z.object({
  providerId: z.string().min(1).max(64),
});

export type GeneralSettingsInput = z.infer<typeof generalSettingsSchema>;
export type StoreSettingsInput = z.infer<typeof storeSettingsSchema>;
export type CheckoutSettingsInput = z.infer<typeof checkoutSettingsSchema>;
export type PaymentSettingsInput = z.infer<typeof paymentSettingsSchema>;
export type DeliverySettingsInput = z.infer<typeof deliverySettingsSchema>;
export type EmailSettingsInput = z.infer<typeof emailSettingsSchema>;
export type SecuritySettingsInput = z.infer<typeof securitySettingsSchema>;
export type MaintenanceSettingsInput = z.infer<typeof maintenanceSettingsSchema>;
