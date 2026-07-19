import { describe, expect, test } from "bun:test";
import { PaymentStatus } from "@/generated/prisma/enums";
import {
  canTransitionPaymentStatus,
  mapFlowStatus,
  normalizeFlowAmount,
} from "@/lib/transactions/status";

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

describe("Flow amount normalization", () => {
  test("normalizes numeric strings returned by Flow sandbox", () => {
    expect(normalizeFlowAmount("115412")).toBe(115412);
    expect(normalizeFlowAmount(" 115412.50 ")).toBe(115412.5);
  });

  test("keeps numeric amounts unchanged", () => {
    expect(normalizeFlowAmount(115412)).toBe(115412);
  });

  test("rejects empty, non-numeric, and non-positive amounts", () => {
    for (const value of ["", "not-a-number", 0, -1, Number.POSITIVE_INFINITY]) {
      expect(() => normalizeFlowAmount(value)).toThrow(
        "Flow informó un monto de pago inválido.",
      );
    }
  });
});
