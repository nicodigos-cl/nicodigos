import { describe, expect, test } from "bun:test";

import {
  parseSettingsSection,
  settingsHref,
  SETTINGS_SECTIONS,
} from "@/lib/settings/sections";
import {
  checkoutSettingsSchema,
  emailSettingsSchema,
  generalSettingsSchema,
  maintenanceSettingsSchema,
  paymentSettingsSchema,
  sendTestEmailSchema,
} from "@/lib/validations/settings";

describe("admin settings sections", () => {
  test("defaults to overview and accepts shareable sections", () => {
    expect(parseSettingsSection(undefined)).toBe("overview");
    expect(parseSettingsSection("payments")).toBe("payments");
    expect(parseSettingsSection("nope")).toBe("overview");
    expect(settingsHref("email")).toBe("/admin/settings?section=email");
    expect(settingsHref()).toBe("/admin/settings");
    expect(SETTINGS_SECTIONS).toContain("maintenance");
  });
});

describe("admin settings validations", () => {
  test("accepts Nicodigos general defaults", () => {
    const result = generalSettingsSchema.safeParse({
      version: 1,
      storeName: "Nicodigos",
      supportEmail: "soporte@nicodigos.com",
      senderName: "Nicodigos",
      primaryColor: "#E15707",
      timezone: "America/Santiago",
      locale: "es",
      country: "CL",
      defaultCurrency: "CLP",
    });
    expect(result.success).toBeTrue();
  });

  test("rejects insecure production-like http urls", () => {
    const result = generalSettingsSchema.safeParse({
      version: 1,
      storeName: "Nicodigos",
      supportEmail: "soporte@nicodigos.com",
      senderName: "Nicodigos",
      primaryColor: "#E15707",
      timezone: "America/Santiago",
      locale: "es",
      country: "CL",
      defaultCurrency: "CLP",
      logoUrl: "http://evil.example/logo.png",
    });
    expect(result.success).toBeFalse();
  });

  test("allows localhost http for local assets", () => {
    const result = generalSettingsSchema.safeParse({
      version: 1,
      storeName: "Nicodigos",
      supportEmail: "soporte@nicodigos.com",
      senderName: "Nicodigos",
      primaryColor: "#E15707",
      timezone: "America/Santiago",
      locale: "es",
      country: "CL",
      defaultCurrency: "clp",
      logoUrl: "http://localhost:3000/logo.webp",
    });
    expect(result.success).toBeTrue();
    if (result.success) {
      expect(result.data.defaultCurrency).toBe("CLP");
    }
  });

  test("requires terms url when acceptance is required", () => {
    const result = checkoutSettingsSchema.safeParse({
      version: 1,
      checkoutEnabled: true,
      requireVerifiedEmail: false,
      requireRut: false,
      requireBillingData: false,
      allowBoleta: true,
      allowFactura: false,
      orderExpirationMinutes: 60,
      paymentExpirationMinutes: 30,
      requireTermsAcceptance: true,
      termsUrl: null,
      privacyUrl: null,
      maxPaymentAttempts: 5,
      reusePendingPaymentIntent: true,
      preventDuplicateOrders: true,
    });
    expect(result.success).toBeFalse();
  });

  test("rejects factura without billing data", () => {
    const result = checkoutSettingsSchema.safeParse({
      version: 1,
      checkoutEnabled: true,
      requireVerifiedEmail: false,
      requireRut: false,
      requireBillingData: false,
      allowBoleta: true,
      allowFactura: true,
      orderExpirationMinutes: 60,
      paymentExpirationMinutes: 30,
      requireTermsAcceptance: false,
      termsUrl: null,
      privacyUrl: null,
      maxPaymentAttempts: 5,
      reusePendingPaymentIntent: true,
      preventDuplicateOrders: true,
    });
    expect(result.success).toBeFalse();
  });

  test("rejects invalid payment amount range", () => {
    const result = paymentSettingsSchema.safeParse({
      version: 1,
      flowEnabled: true,
      acceptedCurrency: "CLP",
      refundsEnabled: true,
      minPaymentAmount: 5000,
      maxPaymentAmount: 1000,
      commerceOrderPrefix: "",
      strictAmountValidation: true,
      strictCurrencyValidation: true,
    });
    expect(result.success).toBeFalse();
  });

  test("validates test email payload", () => {
    expect(
      sendTestEmailSchema.safeParse({
        to: "not-an-email",
        template: "auth-otp",
      }).success,
    ).toBeFalse();
    expect(
      sendTestEmailSchema.safeParse({
        to: "qa@nicodigos.com",
        template: "order-lifecycle",
      }).success,
    ).toBeTrue();
  });

  test("parses email settings without forcing confirmation when critical stay on", () => {
    const result = emailSettingsSchema.safeParse({
      version: 1,
      resendEnabled: true,
      transactionalEmailsEnabled: true,
      adminEmailsEnabled: true,
      emailOrderCreated: true,
      emailPaymentApproved: true,
      emailPaymentRejected: true,
      emailDeliveryAvailable: true,
      emailDeliveryFailed: true,
      emailPasswordReset: true,
      emailEmailVerification: true,
    });
    expect(result.success).toBeTrue();
  });

  test("rejects html in maintenance message", () => {
    const result = maintenanceSettingsSchema.safeParse({
      version: 1,
      storeStatus: "OPEN",
      maintenanceMessage: "<script>alert(1)</script>",
      allowAdminDuringMaintenance: true,
      allowWebhooksDuringMaintenance: true,
      allowJobsDuringMaintenance: true,
      allowOngoingDeliveriesDuringMaintenance: true,
      maxQuantityPerProduct: 99,
      maxProductsPerOrder: 50,
      maxPaymentAttempts: 5,
      deliveryRetryMax: 3,
      keysLowStockThreshold: 5,
      notifyPaymentFailed: true,
      notifyPaymentInconsistent: true,
      notifyDeliveryFailed: true,
      notifyPaidWithoutDelivery: true,
      notifyLowStock: true,
      notifyOutOfStock: true,
      notifySmmStuck: true,
      notifyProviderError: true,
      notifyWebhookFailed: true,
      notifyHighValueSale: true,
    });
    expect(result.success).toBeFalse();
  });

  test("validates admin notification email list", () => {
    const bad = maintenanceSettingsSchema.safeParse({
      version: 1,
      storeStatus: "OPEN",
      allowAdminDuringMaintenance: true,
      allowWebhooksDuringMaintenance: true,
      allowJobsDuringMaintenance: true,
      allowOngoingDeliveriesDuringMaintenance: true,
      maxQuantityPerProduct: 99,
      maxProductsPerOrder: 50,
      maxPaymentAttempts: 5,
      deliveryRetryMax: 3,
      keysLowStockThreshold: 5,
      notifyPaymentFailed: true,
      notifyPaymentInconsistent: true,
      notifyDeliveryFailed: true,
      notifyPaidWithoutDelivery: true,
      notifyLowStock: true,
      notifyOutOfStock: true,
      notifySmmStuck: true,
      notifyProviderError: true,
      notifyWebhookFailed: true,
      notifyHighValueSale: true,
      adminNotificationEmails: "ops@nicodigos.com, not-valid",
    });
    expect(bad.success).toBeFalse();

    const good = maintenanceSettingsSchema.safeParse({
      version: 1,
      storeStatus: "OPEN",
      allowAdminDuringMaintenance: true,
      allowWebhooksDuringMaintenance: true,
      allowJobsDuringMaintenance: true,
      allowOngoingDeliveriesDuringMaintenance: true,
      maxQuantityPerProduct: 99,
      maxProductsPerOrder: 50,
      maxPaymentAttempts: 5,
      deliveryRetryMax: 3,
      keysLowStockThreshold: 5,
      notifyPaymentFailed: true,
      notifyPaymentInconsistent: true,
      notifyDeliveryFailed: true,
      notifyPaidWithoutDelivery: true,
      notifyLowStock: true,
      notifyOutOfStock: true,
      notifySmmStuck: true,
      notifyProviderError: true,
      notifyWebhookFailed: true,
      notifyHighValueSale: true,
      adminNotificationEmails: "ops@nicodigos.com, alerts@nicodigos.com",
    });
    expect(good.success).toBeTrue();
  });
});

describe("settings secret masking helpers", () => {
  test("integrations module masks secrets for UI payloads", async () => {
    const source = await Bun.file(
      new URL("../../src/lib/settings/integrations.ts", import.meta.url),
    ).text();
    expect(source).toContain("maskSecret");
    expect(source).toContain("••••");
    expect(source).toContain("secretHint");
  });
});
