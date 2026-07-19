import { describe, expect, test } from "bun:test";

import { calculateDeliveryPromise } from "@/lib/delivery-promise/calculate";
import type { ProviderBalanceSnapshot } from "@/lib/providers/balance-types";
import { deriveOrderLivePhase } from "@/lib/order-live/phase";
import { canTransitionPaymentStatus } from "@/lib/transactions/status";

function balance(
  partial: Partial<ProviderBalanceSnapshot> &
    Pick<ProviderBalanceSnapshot, "status" | "balance">,
): ProviderBalanceSnapshot {
  return {
    provider: "KINGUIN",
    accountId: "default",
    currency: "EUR",
    checkedAt: new Date().toISOString(),
    source: "api",
    ttlSeconds: 300,
    lastError: null,
    ...partial,
  };
}

describe("delivery promise", () => {
  test("marks Kinguin as instant when balance covers cost", () => {
    const result = calculateDeliveryPromise({
      product: {
        deliveryMethod: "KINGUIN",
        quantity: 2,
        stockAvailable: 10,
        sourceCostEur: 5,
      },
      kinguinBalance: balance({ status: "AVAILABLE", balance: 20 }),
    });
    expect(result.promise).toBe("INSTANT");
    expect(result.estimatedCostAmount).toBe(10);
    expect(result.estimatedCostCurrency).toBe("EUR");
  });

  test("delays when Kinguin balance is insufficient without blocking payment", () => {
    const result = calculateDeliveryPromise({
      product: {
        deliveryMethod: "KINGUIN",
        quantity: 1,
        stockAvailable: 5,
        sourceCostEur: 12,
      },
      kinguinBalance: balance({ status: "AVAILABLE", balance: 5 }),
    });
    expect(result.promise).toBe("DELAYED_12_24H");
  });

  test("delays when Kinguin balance is unknown instead of inventing funds", () => {
    const result = calculateDeliveryPromise({
      product: {
        deliveryMethod: "KINGUIN",
        quantity: 1,
        stockAvailable: 5,
        sourceCostEur: 3,
      },
      kinguinBalance: balance({ status: "UNKNOWN", balance: null }),
    });
    expect(result.promise).toBe("DELAYED_12_24H");
    expect(result.reason).toBe("kinguin_balance_unreliable");
  });

  test("compares SMM estimated cost against panel balance", () => {
    const ok = calculateDeliveryPromise({
      product: {
        deliveryMethod: "SMM",
        quantity: 1000,
        stockAvailable: 1,
        smmRateUsd: 2,
        smmServiceType: "default",
      },
      smmBalance: balance({
        provider: "SMM",
        accountId: "p1",
        status: "AVAILABLE",
        balance: 5,
        currency: "USD",
      }),
    });
    expect(ok.promise).toBe("INSTANT");
    expect(ok.estimatedCostAmount).toBe(2);

    const short = calculateDeliveryPromise({
      product: {
        deliveryMethod: "SMM",
        quantity: 1000,
        stockAvailable: 1,
        smmRateUsd: 10,
        smmServiceType: "default",
      },
      smmBalance: balance({
        provider: "SMM",
        accountId: "p1",
        status: "AVAILABLE",
        balance: 1,
        currency: "USD",
      }),
    });
    expect(short.promise).toBe("DELAYED_12_24H");
  });

  test("manual without keys becomes delayed when fallback is allowed", () => {
    const result = calculateDeliveryPromise({
      product: {
        deliveryMethod: "MANUAL",
        quantity: 2,
        stockAvailable: 0,
      },
    });
    expect(result.promise).toBe("DELAYED_12_24H");
  });
});

describe("payment callback idempotency helpers", () => {
  test("paid cannot transition back to pending", () => {
    expect(canTransitionPaymentStatus("PAID", "PENDING")).toBe(false);
    expect(canTransitionPaymentStatus("PENDING", "PAID")).toBe(true);
  });
});

describe("order live phase for mixed deliveries", () => {
  test("partial delivery stays partial until all items finish", () => {
    expect(
      deriveOrderLivePhase({
        orderStatus: "PARTIALLY_FULFILLED",
        paymentStatus: "PAID",
        deliveryStatuses: ["DELIVERED", "PROCESSING"],
      }),
    ).toBe("PARTIALLY_DELIVERED");
  });

  test("manual review dominates customer-facing status", () => {
    expect(
      deriveOrderLivePhase({
        orderStatus: "PROCESSING",
        paymentStatus: "PAID",
        deliveryStatuses: ["DELIVERED", "MANUAL_REVIEW"],
      }),
    ).toBe("MANUAL_REVIEW");
  });

  test("awaiting payment before Flow confirmation", () => {
    expect(
      deriveOrderLivePhase({
        orderStatus: "PENDING",
        paymentStatus: "PENDING",
        deliveryStatuses: [],
      }),
    ).toBe("AWAITING_PAYMENT");
  });
});
