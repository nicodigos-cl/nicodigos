import { describe, expect, test } from "bun:test";

import {
  canTransitionDeliveryStatus,
  getAllowedDeliveryActions,
} from "@/lib/deliveries/status";

describe("delivery queue statuses", () => {
  test("supports the asynchronous fulfillment lifecycle", () => {
    expect(canTransitionDeliveryStatus("PENDING", "QUEUED")).toBe(true);
    expect(canTransitionDeliveryStatus("QUEUED", "PROCESSING")).toBe(true);
    expect(canTransitionDeliveryStatus("PROCESSING", "MANUAL_REVIEW")).toBe(true);
    expect(canTransitionDeliveryStatus("MANUAL_REVIEW", "PENDING")).toBe(true);
  });

  test("keeps admin recovery available for manual review", () => {
    const actions = getAllowedDeliveryActions({
      status: "MANUAL_REVIEW",
      method: "SMM",
      hasExternalOrderId: false,
      hasKeysOrCredentials: false,
    });
    expect(actions).toContain("smm_send");
    expect(actions).toContain("reopen");
  });
});
