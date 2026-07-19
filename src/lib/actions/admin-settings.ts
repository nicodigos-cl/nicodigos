"use server";

import { Prisma } from "@/generated/prisma/client";
import type { StoreSettings } from "@/generated/prisma/client";
import { AuthOtpEmail } from "@/emails/auth-otp-email";
import { DeliveryCompletedEmail } from "@/emails/delivery-completed-email";
import { DeliveryFailedEmail } from "@/emails/delivery-failed-email";
import { DeliveryProcessingEmail } from "@/emails/delivery-processing-email";
import { OrderCreatedEmail } from "@/emails/order-lifecycle-email";
import type { ActionResult } from "@/lib/actions/types";
import { requireAdminSession } from "@/lib/auth/session";
import { sendReactEmail } from "@/lib/email/resend";
import { getAppBaseUrl, getFlowClient, isFlowConfigured } from "@/lib/flow/client";
import { createLogger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { appendSettingsEvent } from "@/lib/settings/audit";
import {
  buildSettingsChanges,
  ensureStoreSettings,
  toStoreSettingsDto,
} from "@/lib/settings/queries";
import { invalidateOperationalSettingsCache } from "@/lib/settings/runtime";
import {
  assertAdminBalanceRefreshAllowed,
  refreshProviderBalances,
} from "@/lib/providers/balance";
import { SmmService } from "@/lib/smm-service";
import {
  checkoutSettingsSchema,
  deliverySettingsSchema,
  emailSettingsSchema,
  generalSettingsSchema,
  maintenanceSettingsSchema,
  paymentSettingsSchema,
  securitySettingsSchema,
  sendTestEmailSchema,
  storeSettingsSchema,
  testProviderConnectionSchema,
  toggleMaintenanceSchema,
} from "@/lib/validations/settings";
import { revalidatePath } from "next/cache";
import { Resend } from "resend";

const log = createLogger({ module: "admin-settings" });

function parseSubmission(rawInput: unknown): unknown {
  if (!(rawInput instanceof FormData)) return rawInput;
  const payload = rawInput.get("payload");
  if (typeof payload !== "string") return null;
  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

function validationError(error: {
  flatten(): { fieldErrors: Record<string, string[]> };
}): ActionResult<never> {
  return {
    success: false,
    message: "Revisa los campos del formulario.",
    fieldErrors: error.flatten().fieldErrors,
  };
}

function refreshSettings() {
  invalidateOperationalSettingsCache();
  revalidatePath("/admin/settings");
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/checkout");
}

async function actor() {
  const session = await requireAdminSession();
  return { userId: session.user.id, email: session.user.email };
}

function conflict(): ActionResult<never> {
  return {
    success: false,
    message:
      "Otro administrador modificó estos ajustes. Recarga la página e inténtalo de nuevo.",
  };
}

function requireConfirmation(
  needed: boolean,
  confirmation: string | undefined,
  expected: string,
): ActionResult<never> | null {
  if (!needed) return null;
  if (confirmation !== expected) {
    return {
      success: false,
      message: `Confirma escribiendo ${expected}.`,
      fieldErrors: { confirmation: [`Escribe ${expected} para confirmar.`] },
    };
  }
  return null;
}

async function applyPartialUpdate(input: {
  section: string;
  action: string;
  version: number;
  actor: { userId: string; email: string };
  data: Prisma.StoreSettingsUpdateInput;
  keys: readonly string[];
  previous: StoreSettings;
  message?: string;
}): Promise<ActionResult<{ version: number; updatedAt: string }>> {
  try {
    const updated = await prisma.$transaction(async (tx) => {
      const current = await tx.storeSettings.findUnique({
        where: { id: "default" },
      });
      if (!current || current.version !== input.version) {
        throw new Error("VERSION_CONFLICT");
      }

      return tx.storeSettings.update({
        where: { id: "default" },
        data: {
          ...input.data,
          version: { increment: 1 },
        },
      });
    });

    const changes = buildSettingsChanges(
      input.previous,
      updated,
      input.keys,
    );

    if (input.previous.auditSettingsChanges !== false) {
      await appendSettingsEvent({
        section: input.section,
        action: input.action,
        actorUserId: input.actor.userId,
        actorEmail: input.actor.email,
        changes,
        message: input.message,
        result: "success",
      });
    }

    log.info(
      {
        section: input.section,
        action: input.action,
        actor: input.actor.email,
        changeCount: changes.length,
      },
      "settings updated",
    );

    refreshSettings();
    return {
      success: true,
      data: {
        version: updated.version,
        updatedAt: updated.updatedAt.toISOString(),
      },
    };
  } catch (error) {
    if (error instanceof Error && error.message === "VERSION_CONFLICT") {
      return conflict();
    }
    log.error(
      { err: error, section: input.section, action: input.action },
      "settings update failed",
    );
    return {
      success: false,
      message: `No pudimos guardar los ajustes de ${input.section}. Revisa los campos e intenta nuevamente.`,
    };
  }
}

function decimalData(
  value: number | null,
): Prisma.Decimal | null {
  if (value === null) return null;
  return new Prisma.Decimal(value);
}

export async function updateGeneralSettingsAction(
  rawInput: unknown,
): Promise<ActionResult<{ version: number; updatedAt: string }>> {
  const currentActor = await actor();
  const parsed = generalSettingsSchema.safeParse(parseSubmission(rawInput));
  if (!parsed.success) return validationError(parsed.error);

  const previous = await ensureStoreSettings();
  const data = parsed.data;
  const keys = [
    "storeName",
    "legalName",
    "shortDescription",
    "supportEmail",
    "senderName",
    "replyToEmail",
    "primaryColor",
    "timezone",
    "locale",
    "country",
    "defaultCurrency",
    "logoUrl",
    "faviconUrl",
  ] as const;

  return applyPartialUpdate({
    section: "general",
    action: "update_general",
    version: data.version,
    actor: currentActor,
    previous,
    keys,
    data: {
      storeName: data.storeName,
      legalName: data.legalName,
      shortDescription: data.shortDescription,
      supportEmail: data.supportEmail,
      senderName: data.senderName,
      replyToEmail: data.replyToEmail,
      primaryColor: data.primaryColor,
      timezone: data.timezone,
      locale: data.locale,
      country: data.country,
      defaultCurrency: data.defaultCurrency,
      logoUrl: data.logoUrl,
      faviconUrl: data.faviconUrl,
    },
  });
}

export async function updateStoreSettingsAction(
  rawInput: unknown,
): Promise<ActionResult<{ version: number; updatedAt: string }>> {
  const currentActor = await actor();
  const parsed = storeSettingsSchema.safeParse(parseSubmission(rawInput));
  if (!parsed.success) return validationError(parsed.error);

  const previous = await ensureStoreSettings();
  const data = parsed.data;
  const keys = [
    "storeStatus",
    "showOutOfStock",
    "allowPurchaseWithoutStock",
    "pricesIncludeTax",
    "minOrderAmount",
    "maxOrderAmount",
    "maxQuantityPerProduct",
    "maxProductsPerOrder",
    "supportVisible",
    "availabilityMessage",
  ] as const;

  return applyPartialUpdate({
    section: "store",
    action: "update_store",
    version: data.version,
    actor: currentActor,
    previous,
    keys,
    data: {
      storeStatus: data.storeStatus,
      showOutOfStock: data.showOutOfStock,
      allowPurchaseWithoutStock: data.allowPurchaseWithoutStock,
      pricesIncludeTax: data.pricesIncludeTax,
      minOrderAmount: decimalData(data.minOrderAmount),
      maxOrderAmount: decimalData(data.maxOrderAmount),
      maxQuantityPerProduct: data.maxQuantityPerProduct,
      maxProductsPerOrder: data.maxProductsPerOrder,
      supportVisible: data.supportVisible,
      availabilityMessage: data.availabilityMessage,
    },
  });
}

export async function updateCheckoutSettingsAction(
  rawInput: unknown,
): Promise<ActionResult<{ version: number; updatedAt: string }>> {
  const currentActor = await actor();
  const parsed = checkoutSettingsSchema.safeParse(parseSubmission(rawInput));
  if (!parsed.success) return validationError(parsed.error);

  const previous = await ensureStoreSettings();
  const data = parsed.data;

  const confirmErr = requireConfirmation(
    previous.checkoutEnabled && !data.checkoutEnabled,
    data.confirmation,
    "DESACTIVAR_CHECKOUT",
  );
  if (confirmErr) return confirmErr;

  const keys = [
    "checkoutEnabled",
    "requireVerifiedEmail",
    "requireRut",
    "requireBillingData",
    "allowBoleta",
    "allowFactura",
    "orderExpirationMinutes",
    "paymentExpirationMinutes",
    "requireTermsAcceptance",
    "termsUrl",
    "privacyUrl",
    "maxPaymentAttempts",
    "reusePendingPaymentIntent",
    "preventDuplicateOrders",
  ] as const;

  return applyPartialUpdate({
    section: "checkout",
    action: "update_checkout",
    version: data.version,
    actor: currentActor,
    previous,
    keys,
    message: !data.checkoutEnabled ? "Checkout desactivado" : undefined,
    data: {
      checkoutEnabled: data.checkoutEnabled,
      requireVerifiedEmail: data.requireVerifiedEmail,
      requireRut: data.requireRut,
      requireBillingData: data.requireBillingData,
      allowBoleta: data.allowBoleta,
      allowFactura: data.allowFactura,
      orderExpirationMinutes: data.orderExpirationMinutes,
      paymentExpirationMinutes: data.paymentExpirationMinutes,
      requireTermsAcceptance: data.requireTermsAcceptance,
      termsUrl: data.termsUrl,
      privacyUrl: data.privacyUrl,
      maxPaymentAttempts: data.maxPaymentAttempts,
      reusePendingPaymentIntent: data.reusePendingPaymentIntent,
      preventDuplicateOrders: data.preventDuplicateOrders,
    },
  });
}

export async function updatePaymentSettingsAction(
  rawInput: unknown,
): Promise<ActionResult<{ version: number; updatedAt: string }>> {
  const currentActor = await actor();
  const parsed = paymentSettingsSchema.safeParse(parseSubmission(rawInput));
  if (!parsed.success) return validationError(parsed.error);

  const previous = await ensureStoreSettings();
  const data = parsed.data;

  const confirmErr = requireConfirmation(
    previous.flowEnabled && !data.flowEnabled,
    data.confirmation,
    "DESACTIVAR_FLOW",
  );
  if (confirmErr) return confirmErr;

  const keys = [
    "flowEnabled",
    "acceptedCurrency",
    "refundsEnabled",
    "minPaymentAmount",
    "maxPaymentAmount",
    "commerceOrderPrefix",
    "strictAmountValidation",
    "strictCurrencyValidation",
  ] as const;

  return applyPartialUpdate({
    section: "payments",
    action: "update_payments",
    version: data.version,
    actor: currentActor,
    previous,
    keys,
    message: !data.flowEnabled ? "Flow desactivado" : undefined,
    data: {
      flowEnabled: data.flowEnabled,
      acceptedCurrency: data.acceptedCurrency,
      refundsEnabled: data.refundsEnabled,
      minPaymentAmount: decimalData(data.minPaymentAmount),
      maxPaymentAmount: decimalData(data.maxPaymentAmount),
      commerceOrderPrefix: data.commerceOrderPrefix,
      strictAmountValidation: data.strictAmountValidation,
      strictCurrencyValidation: data.strictCurrencyValidation,
    },
  });
}

export async function updateDeliverySettingsAction(
  rawInput: unknown,
): Promise<ActionResult<{ version: number; updatedAt: string }>> {
  const currentActor = await actor();
  const parsed = deliverySettingsSchema.safeParse(parseSubmission(rawInput));
  if (!parsed.success) return validationError(parsed.error);

  const previous = await ensureStoreSettings();
  const data = parsed.data;

  const confirmErr = requireConfirmation(
    previous.automaticDeliveryEnabled && !data.automaticDeliveryEnabled,
    data.confirmation,
    "DESACTIVAR_ENTREGAS_AUTO",
  );
  if (confirmErr) return confirmErr;

  const keys = [
    "automaticDeliveryEnabled",
    "manualDeliveryEnabled",
    "autoSendAfterPayment",
    "deliveryRetryMax",
    "deliveryRetryIntervalMinutes",
    "allowPartialDeliveries",
    "allowEmailResend",
    "requireRecentSessionForCredentials",
    "sensitiveLinkExpirationMinutes",
    "hideCredentialsByDefault",
    "keysAutoAssign",
    "keysReserveDuringCheckout",
    "keysReserveDurationMinutes",
    "keysLowStockThreshold",
    "keysStockAlertsEnabled",
    "keysAllowManualReplace",
    "accountsAutoAssign",
    "accountsRequireRecentSession",
    "accountsHideCredentials",
    "accountsAllowReplace",
    "smmAutoSend",
    "smmManualSend",
    "smmMaxRetries",
    "smmAllowPartials",
    "smmValidateUrl",
    "smmStuckAlertMinutes",
  ] as const;

  return applyPartialUpdate({
    section: "deliveries",
    action: "update_deliveries",
    version: data.version,
    actor: currentActor,
    previous,
    keys,
    data: {
      automaticDeliveryEnabled: data.automaticDeliveryEnabled,
      manualDeliveryEnabled: data.manualDeliveryEnabled,
      autoSendAfterPayment: data.autoSendAfterPayment,
      deliveryRetryMax: data.deliveryRetryMax,
      deliveryRetryIntervalMinutes: data.deliveryRetryIntervalMinutes,
      allowPartialDeliveries: data.allowPartialDeliveries,
      allowEmailResend: data.allowEmailResend,
      requireRecentSessionForCredentials: data.requireRecentSessionForCredentials,
      sensitiveLinkExpirationMinutes: data.sensitiveLinkExpirationMinutes,
      hideCredentialsByDefault: data.hideCredentialsByDefault,
      keysAutoAssign: data.keysAutoAssign,
      keysReserveDuringCheckout: data.keysReserveDuringCheckout,
      keysReserveDurationMinutes: data.keysReserveDurationMinutes,
      keysLowStockThreshold: data.keysLowStockThreshold,
      keysStockAlertsEnabled: data.keysStockAlertsEnabled,
      keysAllowManualReplace: data.keysAllowManualReplace,
      accountsAutoAssign: data.accountsAutoAssign,
      accountsRequireRecentSession: data.accountsRequireRecentSession,
      accountsHideCredentials: data.accountsHideCredentials,
      accountsAllowReplace: data.accountsAllowReplace,
      smmAutoSend: data.smmAutoSend,
      smmManualSend: data.smmManualSend,
      smmMaxRetries: data.smmMaxRetries,
      smmAllowPartials: data.smmAllowPartials,
      smmValidateUrl: data.smmValidateUrl,
      smmStuckAlertMinutes: data.smmStuckAlertMinutes,
    },
  });
}

export async function updateEmailSettingsAction(
  rawInput: unknown,
): Promise<ActionResult<{ version: number; updatedAt: string }>> {
  const currentActor = await actor();
  const parsed = emailSettingsSchema.safeParse(parseSubmission(rawInput));
  if (!parsed.success) return validationError(parsed.error);

  const previous = await ensureStoreSettings();
  const data = parsed.data;

  const disablingCritical =
    (previous.emailPasswordReset && !data.emailPasswordReset) ||
    (previous.emailEmailVerification && !data.emailEmailVerification);

  const confirmErr = requireConfirmation(
    disablingCritical,
    data.confirmation,
    "DESACTIVAR_EMAILS_CRITICOS",
  );
  if (confirmErr) return confirmErr;

  const keys = [
    "resendEnabled",
    "replyToEmail",
    "transactionalEmailsEnabled",
    "adminEmailsEnabled",
    "emailOrderCreated",
    "emailPaymentApproved",
    "emailPaymentRejected",
    "emailDeliveryAvailable",
    "emailDeliveryFailed",
    "emailPasswordReset",
    "emailEmailVerification",
  ] as const;

  return applyPartialUpdate({
    section: "email",
    action: "update_email",
    version: data.version,
    actor: currentActor,
    previous,
    keys,
    data: {
      resendEnabled: data.resendEnabled,
      replyToEmail: data.replyToEmail,
      transactionalEmailsEnabled: data.transactionalEmailsEnabled,
      adminEmailsEnabled: data.adminEmailsEnabled,
      emailOrderCreated: data.emailOrderCreated,
      emailPaymentApproved: data.emailPaymentApproved,
      emailPaymentRejected: data.emailPaymentRejected,
      emailDeliveryAvailable: data.emailDeliveryAvailable,
      emailDeliveryFailed: data.emailDeliveryFailed,
      emailPasswordReset: data.emailPasswordReset,
      emailEmailVerification: data.emailEmailVerification,
    },
  });
}

export async function updateSecuritySettingsAction(
  rawInput: unknown,
): Promise<ActionResult<{ version: number; updatedAt: string }>> {
  const currentActor = await actor();
  const parsed = securitySettingsSchema.safeParse(parseSubmission(rawInput));
  if (!parsed.success) return validationError(parsed.error);

  const previous = await ensureStoreSettings();
  const data = parsed.data;
  const keys = [
    "requireEmailVerifiedForCheckout",
    "reauthForCredentialReveal",
    "auditSettingsChanges",
  ] as const;

  return applyPartialUpdate({
    section: "security",
    action: "update_security",
    version: data.version,
    actor: currentActor,
    previous,
    keys,
    data: {
      requireEmailVerifiedForCheckout: data.requireEmailVerifiedForCheckout,
      reauthForCredentialReveal: data.reauthForCredentialReveal,
      auditSettingsChanges: data.auditSettingsChanges,
    },
  });
}

export async function updateMaintenanceSettingsAction(
  rawInput: unknown,
): Promise<ActionResult<{ version: number; updatedAt: string }>> {
  const currentActor = await actor();
  const parsed = maintenanceSettingsSchema.safeParse(parseSubmission(rawInput));
  if (!parsed.success) return validationError(parsed.error);

  const previous = await ensureStoreSettings();
  const data = parsed.data;

  const enablingMaintenance =
    previous.storeStatus !== "MAINTENANCE" &&
    data.storeStatus === "MAINTENANCE";

  const confirmErr = requireConfirmation(
    enablingMaintenance,
    data.confirmation,
    "ACTIVAR_MANTENIMIENTO",
  );
  if (confirmErr) return confirmErr;

  if (
    enablingMaintenance &&
    !data.allowWebhooksDuringMaintenance
  ) {
    return {
      success: false,
      message:
        "No se recomienda bloquear webhooks durante mantenimiento. Mantén allowWebhooksDuringMaintenance activo o confirma el impacto en pagos.",
      fieldErrors: {
        allowWebhooksDuringMaintenance: [
          "Los callbacks de Flow deben permanecer activos.",
        ],
      },
    };
  }

  const keys = [
    "storeStatus",
    "maintenanceMessage",
    "estimatedReturnAt",
    "allowAdminDuringMaintenance",
    "allowWebhooksDuringMaintenance",
    "allowJobsDuringMaintenance",
    "allowOngoingDeliveriesDuringMaintenance",
    "maxQuantityPerProduct",
    "maxProductsPerOrder",
    "maxPaymentAttempts",
    "deliveryRetryMax",
    "keysLowStockThreshold",
    "notifyPaymentFailed",
    "notifyPaymentInconsistent",
    "notifyDeliveryFailed",
    "notifyPaidWithoutDelivery",
    "notifyLowStock",
    "notifyOutOfStock",
    "notifySmmStuck",
    "notifyProviderError",
    "notifyWebhookFailed",
    "notifyHighValueSale",
    "highValueSaleThreshold",
    "adminNotificationEmails",
  ] as const;

  return applyPartialUpdate({
    section: "maintenance",
    action: "update_maintenance",
    version: data.version,
    actor: currentActor,
    previous,
    keys,
    message:
      data.storeStatus === "MAINTENANCE"
        ? "Modo mantenimiento activado"
        : undefined,
    data: {
      storeStatus: data.storeStatus,
      maintenanceMessage: data.maintenanceMessage,
      estimatedReturnAt: data.estimatedReturnAt
        ? new Date(data.estimatedReturnAt)
        : null,
      allowAdminDuringMaintenance: data.allowAdminDuringMaintenance,
      allowWebhooksDuringMaintenance: data.allowWebhooksDuringMaintenance,
      allowJobsDuringMaintenance: data.allowJobsDuringMaintenance,
      allowOngoingDeliveriesDuringMaintenance:
        data.allowOngoingDeliveriesDuringMaintenance,
      maxQuantityPerProduct: data.maxQuantityPerProduct,
      maxProductsPerOrder: data.maxProductsPerOrder,
      maxPaymentAttempts: data.maxPaymentAttempts,
      deliveryRetryMax: data.deliveryRetryMax,
      keysLowStockThreshold: data.keysLowStockThreshold,
      notifyPaymentFailed: data.notifyPaymentFailed,
      notifyPaymentInconsistent: data.notifyPaymentInconsistent,
      notifyDeliveryFailed: data.notifyDeliveryFailed,
      notifyPaidWithoutDelivery: data.notifyPaidWithoutDelivery,
      notifyLowStock: data.notifyLowStock,
      notifyOutOfStock: data.notifyOutOfStock,
      notifySmmStuck: data.notifySmmStuck,
      notifyProviderError: data.notifyProviderError,
      notifyWebhookFailed: data.notifyWebhookFailed,
      notifyHighValueSale: data.notifyHighValueSale,
      highValueSaleThreshold: decimalData(data.highValueSaleThreshold),
      adminNotificationEmails: data.adminNotificationEmails,
    },
  });
}

export async function toggleMaintenanceModeAction(
  rawInput: unknown,
): Promise<ActionResult<{ version: number; updatedAt: string }>> {
  const currentActor = await actor();
  const parsed = toggleMaintenanceSchema.safeParse(parseSubmission(rawInput));
  if (!parsed.success) return validationError(parsed.error);

  const previous = await ensureStoreSettings();
  const data = parsed.data;
  const expected = data.enable
    ? "ACTIVAR_MANTENIMIENTO"
    : "DESACTIVAR_MANTENIMIENTO";
  if (data.confirmation !== expected) {
    return {
      success: false,
      message: `Confirma escribiendo ${expected}.`,
    };
  }

  return applyPartialUpdate({
    section: "maintenance",
    action: data.enable ? "enable_maintenance" : "disable_maintenance",
    version: data.version,
    actor: currentActor,
    previous,
    keys: ["storeStatus", "maintenanceMessage"],
    message: data.enable
      ? "Modo mantenimiento activado"
      : "Modo mantenimiento desactivado",
    data: {
      storeStatus: data.enable ? "MAINTENANCE" : "OPEN",
      maintenanceMessage: data.message ?? previous.maintenanceMessage,
    },
  });
}

export async function testFlowConnectionAction(): Promise<
  ActionResult<{ latencyMs: number; environment: string }>
> {
  const currentActor = await actor();
  const started = Date.now();

  if (!isFlowConfigured()) {
    await appendSettingsEvent({
      section: "payments",
      action: "test_flow",
      actorUserId: currentActor.userId,
      actorEmail: currentActor.email,
      result: "failure",
      message: "Flow no configurado",
    });
    return {
      success: false,
      message:
        "La conexión con Flow no pudo verificarse. Confirma FLOW_API_KEY y FLOW_SECRET_KEY.",
    };
  }

  try {
    const flow = getFlowClient();
    // Safe probe: list associated merchants (no charge created).
    await flow.merchants.getAssociatedMerchants({ start: 0, limit: 1 });
    const latencyMs = Date.now() - started;
    await appendSettingsEvent({
      section: "payments",
      action: "test_flow",
      actorUserId: currentActor.userId,
      actorEmail: currentActor.email,
      result: "success",
      message: `Conexión OK (${latencyMs}ms)`,
    });
    log.info(
      { actor: currentActor.email, latencyMs },
      "flow connection test ok",
    );
    return {
      success: true,
      data: {
        latencyMs,
        environment:
          process.env.FLOW_ENVIRONMENT === "production"
            ? "production"
            : "sandbox",
      },
    };
  } catch (error) {
    const latencyMs = Date.now() - started;
    await appendSettingsEvent({
      section: "payments",
      action: "test_flow",
      actorUserId: currentActor.userId,
      actorEmail: currentActor.email,
      result: "failure",
      message: "Error de conexión sanitizado",
    });
    log.warn(
      {
        actor: currentActor.email,
        latencyMs,
        code:
          error && typeof error === "object" && "name" in error
            ? String(error.name)
            : "unknown",
      },
      "flow connection test failed",
    );
    return {
      success: false,
      message:
        "La conexión con Flow no pudo verificarse. Confirma la configuración del servidor.",
    };
  }
}

export async function testResendConnectionAction(): Promise<
  ActionResult<{ latencyMs: number }>
> {
  const currentActor = await actor();
  const started = Date.now();
  const apiKey = process.env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    await appendSettingsEvent({
      section: "email",
      action: "test_resend",
      actorUserId: currentActor.userId,
      actorEmail: currentActor.email,
      result: "failure",
      message: "Resend no configurado",
    });
    return {
      success: false,
      message:
        "La conexión con Resend no pudo verificarse. Confirma RESEND_API_KEY.",
    };
  }

  try {
    const resend = new Resend(apiKey);
    const result = await resend.domains.list();
    if (result.error) {
      throw new Error(result.error.message);
    }
    const latencyMs = Date.now() - started;
    await appendSettingsEvent({
      section: "email",
      action: "test_resend",
      actorUserId: currentActor.userId,
      actorEmail: currentActor.email,
      result: "success",
      message: `Conexión OK (${latencyMs}ms)`,
    });
    return { success: true, data: { latencyMs } };
  } catch {
    await appendSettingsEvent({
      section: "email",
      action: "test_resend",
      actorUserId: currentActor.userId,
      actorEmail: currentActor.email,
      result: "failure",
      message: "Error de conexión sanitizado",
    });
    return {
      success: false,
      message:
        "La conexión con Resend no pudo verificarse. Confirma la configuración del servidor.",
    };
  }
}

export async function sendTestEmailAction(
  rawInput: unknown,
): Promise<ActionResult<{ to: string; template: string }>> {
  const currentActor = await actor();
  const parsed = sendTestEmailSchema.safeParse(parseSubmission(rawInput));
  if (!parsed.success) return validationError(parsed.error);

  const settings = toStoreSettingsDto(await ensureStoreSettings());
  if (!settings.resendEnabled) {
    return {
      success: false,
      message: "Resend está desactivado en ajustes.",
    };
  }

  const { to, template } = parsed.data;
  const baseUrl = getAppBaseUrl();

  try {
    const orderUrl = `${baseUrl}/dashboard/pedidos`;
    const react =
      template === "auth-otp"
        ? AuthOtpEmail({
            email: to,
            otp: "123456",
            type: "sign-in",
            userName: "Usuario de prueba",
            url: `${baseUrl}/auth/otp?email=${encodeURIComponent(to)}`,
          })
        : template === "delivery-completed"
          ? DeliveryCompletedEmail({
              customerName: "Cliente de prueba",
              orderId: "ORDER_TEST",
              productName: "Producto ficticio",
              quantity: 1,
              deliveredAt: new Date().toISOString(),
              orderUrl,
              customerMessage: "Email de prueba — datos ficticios.",
              contentLabels: ["Key de prueba"],
              hasSecrets: false,
            })
          : template === "delivery-failed"
            ? DeliveryFailedEmail({
                customerName: "Cliente de prueba",
                orderId: "ORDER_TEST",
                productName: "Producto ficticio",
                orderUrl,
              })
            : template === "delivery-processing"
              ? DeliveryProcessingEmail({
                  customerName: "Cliente de prueba",
                  orderId: "ORDER_TEST",
                  productName: "Producto ficticio",
                  orderUrl,
                })
              : OrderCreatedEmail({
                  customerName: "Cliente de prueba",
                  orderNumber: "ORDER_TEST",
                  orderUrl,
                  totalLabel: "$1.000 CLP",
                  message:
                    "Este es un email de prueba generado desde Ajustes. No corresponde a un pedido real.",
                });

    await sendReactEmail({
      to,
      subject: `[Prueba Nicodigos] Template ${template}`,
      category: "test",
      react,
    });

    await appendSettingsEvent({
      section: "email",
      action: "send_test_email",
      actorUserId: currentActor.userId,
      actorEmail: currentActor.email,
      message: `Template ${template} → ${to}`,
      result: "success",
    });

    return { success: true, data: { to, template } };
  } catch {
    await appendSettingsEvent({
      section: "email",
      action: "send_test_email",
      actorUserId: currentActor.userId,
      actorEmail: currentActor.email,
      result: "failure",
      message: "Envío de prueba fallido",
    });
    return {
      success: false,
      message: "No pudimos enviar el email de prueba. Revisa Resend.",
    };
  }
}

export async function testSmmProviderAction(
  rawInput: unknown,
): Promise<
  ActionResult<{ latencyMs: number; balance?: string; services?: number }>
> {
  const currentActor = await actor();
  const parsed = testProviderConnectionSchema.safeParse(
    parseSubmission(rawInput),
  );
  if (!parsed.success) return validationError(parsed.error);

  const provider = await prisma.smmProvider.findUnique({
    where: { id: parsed.data.providerId },
    select: { id: true, name: true, apiUrl: true, apiKey: true },
  });

  if (!provider) {
    return { success: false, message: "Proveedor no encontrado." };
  }

  const started = Date.now();
  try {
    const client = new SmmService({
      apiUrl: provider.apiUrl,
      apiKey: provider.apiKey,
    });
    const [balance, services] = await Promise.all([
      client.balance(),
      client.services(),
    ]);
    const latencyMs = Date.now() - started;
    await appendSettingsEvent({
      section: "providers",
      action: "test_smm",
      actorUserId: currentActor.userId,
      actorEmail: currentActor.email,
      message: `OK ${provider.name} (${latencyMs}ms)`,
      result: "success",
    });
    return {
      success: true,
      data: {
        latencyMs,
        balance: `${balance.balance} ${balance.currency}`,
        services: services.length,
      },
    };
  } catch {
    await appendSettingsEvent({
      section: "providers",
      action: "test_smm",
      actorUserId: currentActor.userId,
      actorEmail: currentActor.email,
      result: "failure",
      message: "Error de conexión sanitizado",
    });
    return {
      success: false,
      message:
        "No pudimos verificar el proveedor SMM. Confirma apiUrl y apiKey.",
    };
  }
}

export async function testProviderConnectionAction(
  rawInput: unknown,
): Promise<
  ActionResult<{ latencyMs: number; balance?: string; services?: number }>
> {
  return testSmmProviderAction(rawInput);
}

export async function refreshProviderBalancesAction(): Promise<
  ActionResult<{
    kinguinStatus: string;
    smmCount: number;
  }>
> {
  const currentActor = await actor();
  const gate = await assertAdminBalanceRefreshAllowed(currentActor.userId);
  if (!gate.ok) {
    return { success: false, message: gate.message };
  }

  try {
    const result = await refreshProviderBalances({ forceRefresh: true });
    await appendSettingsEvent({
      section: "providers",
      action: "refresh_balances",
      actorUserId: currentActor.userId,
      actorEmail: currentActor.email,
      message: `Kinguin ${result.kinguin.status}; SMM ${result.smm.length}`,
      result: "success",
    });
    return {
      success: true,
      data: {
        kinguinStatus: result.kinguin.status,
        smmCount: result.smm.length,
      },
    };
  } catch {
    await appendSettingsEvent({
      section: "providers",
      action: "refresh_balances",
      actorUserId: currentActor.userId,
      actorEmail: currentActor.email,
      result: "failure",
      message: "No se pudieron actualizar los saldos",
    });
    return {
      success: false,
      message: "No se pudieron actualizar los saldos de proveedores.",
    };
  }
}

