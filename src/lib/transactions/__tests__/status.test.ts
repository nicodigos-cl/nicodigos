import { describe, expect, test } from "bun:test";
import { PaymentStatus } from "@/generated/prisma/enums";
import { canTransitionPaymentStatus, mapFlowStatus } from "@/lib/transactions/status";

describe("payment state machine", () => {
  test("maps all real Flow states", () => {
    expect(mapFlowStatus(1)).toBe(PaymentStatus.PENDING);
    expect(mapFlowStatus(2)).toBe(PaymentStatus.PAID);
    expect(mapFlowStatus(3)).toBe(PaymentStatus.REJECTED);
    expect(mapFlowStatus(4)).toBe(PaymentStatus.CANCELLED);
  });
  test("blocks unsafe manual transitions", () => {
    expect(canTransitionPaymentStatus(PaymentStatus.FAILED, PaymentStatus.PAID)).toBeFalse();
    expect(canTransitionPaymentStatus(PaymentStatus.REFUNDED, PaymentStatus.PAID)).toBeFalse();
    expect(canTransitionPaymentStatus(PaymentStatus.PAID, PaymentStatus.REFUNDED)).toBeTrue();
  });
});
