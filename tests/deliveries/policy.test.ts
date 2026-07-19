import { describe, expect, test } from "bun:test";

import {
  canProcessDeliveryJobs,
  canResendDeliveryEmail,
  canWorkerAutoFulfill,
  decideDeliveryEnsureAction,
  getDeliveryRetryOptions,
  isSmmPartialAllowed,
  type DeliveryPolicySettings,
} from "@/lib/deliveries/policy";

function settings(
  overrides: Partial<DeliveryPolicySettings> = {},
): DeliveryPolicySettings {
  return {
    storeStatus: "OPEN",
    automaticDeliveryEnabled: true,
    manualDeliveryEnabled: true,
    autoSendAfterPayment: true,
    deliveryRetryMax: 3,
    deliveryRetryIntervalMinutes: 5,
    allowPartialDeliveries: false,
    allowEmailResend: true,
    requireRecentSessionForCredentials: false,
    sensitiveLinkExpirationMinutes: 30,
    hideCredentialsByDefault: true,
    keysAutoAssign: true,
    keysAllowManualReplace: true,
    accountsAutoAssign: false,
    accountsRequireRecentSession: false,
    accountsHideCredentials: true,
    accountsAllowReplace: true,
    smmAutoSend: true,
    smmManualSend: true,
    smmMaxRetries: 5,
    smmAllowPartials: false,
    reauthForCredentialReveal: false,
    allowJobsDuringMaintenance: true,
    allowOngoingDeliveriesDuringMaintenance: true,
    ...overrides,
  };
}

describe("delivery policy", () => {
  test("parks KINGUIN when auto-send after payment is off", () => {
    const decision = decideDeliveryEnsureAction(
      settings({ autoSendAfterPayment: false }),
      "KINGUIN",
      true,
    );
    expect(decision.action).toBe("park_manual");
  });

  test("requests KINGUIN when automation is fully on", () => {
    expect(
      decideDeliveryEnsureAction(settings(), "KINGUIN", true).action,
    ).toBe("request");
  });

  test("parks MANUAL when keys and accounts auto-assign are off", () => {
    const decision = decideDeliveryEnsureAction(
      settings({ keysAutoAssign: false, accountsAutoAssign: false }),
      "MANUAL",
      true,
    );
    expect(decision.action).toBe("park_manual");
  });

  test("requests MANUAL when accountsAutoAssign is on", () => {
    expect(
      decideDeliveryEnsureAction(
        settings({ keysAutoAssign: false, accountsAutoAssign: true }),
        "MANUAL",
        true,
      ).action,
    ).toBe("request");
  });

  test("parks everything when automaticDeliveryEnabled is off", () => {
    const decision = decideDeliveryEnsureAction(
      settings({ automaticDeliveryEnabled: false }),
      "KINGUIN",
      true,
    );
    expect(decision.action).toBe("park_manual");
  });

  test("worker refuses when policy parks", () => {
    const result = canWorkerAutoFulfill(
      settings({ autoSendAfterPayment: false }),
      "KINGUIN",
    );
    expect(result.ok).toBe(false);
  });

  test("retry options use SMM-specific max", () => {
    const opts = getDeliveryRetryOptions(
      settings({ smmMaxRetries: 7, deliveryRetryMax: 2 }),
      "SMM",
    );
    expect(opts.attempts).toBe(8);
  });

  test("SMM partials respect settings", () => {
    expect(
      isSmmPartialAllowed(settings({ smmAllowPartials: false }), "partial"),
    ).toBe(false);
    expect(
      isSmmPartialAllowed(settings({ smmAllowPartials: true }), "partial"),
    ).toBe(true);
    expect(isSmmPartialAllowed(settings(), "completed")).toBe(true);
  });

  test("resend email gated by allowEmailResend", () => {
    expect(
      canResendDeliveryEmail(settings({ allowEmailResend: false })).ok,
    ).toBe(false);
    expect(canResendDeliveryEmail(settings()).ok).toBe(true);
  });

  test("maintenance pauses delivery jobs when configured", () => {
    expect(
      canProcessDeliveryJobs(
        settings({
          storeStatus: "MAINTENANCE",
          allowOngoingDeliveriesDuringMaintenance: false,
        }),
      ).ok,
    ).toBe(false);
    expect(
      canProcessDeliveryJobs(
        settings({
          storeStatus: "MAINTENANCE",
          allowJobsDuringMaintenance: true,
          allowOngoingDeliveriesDuringMaintenance: true,
        }),
      ).ok,
    ).toBe(true);
  });
});
