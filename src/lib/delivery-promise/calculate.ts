import type { DeliveryMethod, DeliveryPromise } from "@/generated/prisma/client";

import type { ProviderBalanceSnapshot } from "@/lib/providers/balance-types";
import { smmUsesPerThousandPricing } from "@/lib/products/smm-pricing";

export type DeliveryPromiseEstimate = {
  promise: DeliveryPromise;
  estimatedCostAmount: number | null;
  estimatedCostCurrency: string | null;
  reason: string;
};

export type DeliveryPromiseProductInput = {
  deliveryMethod: DeliveryMethod;
  quantity: number;
  /** Available buyable stock (keys / offer qty / smm qty). */
  stockAvailable: number;
  /** Kinguin source cost in EUR (unit). */
  sourceCostEur?: number | null;
  /** SMM panel rate in USD (usually per 1000). */
  smmRateUsd?: number | null;
  smmServiceType?: string | null;
  smmApiUrl?: string | null;
};

function estimateSmmCostUsd(input: DeliveryPromiseProductInput): number | null {
  if (input.smmRateUsd == null || !Number.isFinite(input.smmRateUsd)) {
    return null;
  }
  const qty = Math.max(1, input.quantity);
  if (!smmUsesPerThousandPricing(input.smmServiceType)) {
    return input.smmRateUsd;
  }
  return (input.smmRateUsd / 1000) * qty;
}

function estimateKinguinCostEur(input: DeliveryPromiseProductInput): number | null {
  if (input.sourceCostEur == null || !Number.isFinite(input.sourceCostEur)) {
    return null;
  }
  return input.sourceCostEur * Math.max(1, input.quantity);
}

function balanceCovers(
  balance: ProviderBalanceSnapshot | null | undefined,
  cost: number | null,
): "yes" | "no" | "unknown" {
  if (cost == null || !Number.isFinite(cost)) return "unknown";
  if (!balance || balance.balance == null || !Number.isFinite(balance.balance)) {
    return "unknown";
  }
  if (
    balance.status === "ERROR" ||
    balance.status === "UNKNOWN" ||
    balance.status === "INSUFFICIENT"
  ) {
    if (balance.status === "INSUFFICIENT") return "no";
    return "unknown";
  }
  return balance.balance >= cost ? "yes" : "no";
}

/**
 * Pure calculation of delivery promise given stock + optional provider balances.
 * PostgreSQL remains source of truth for orders; this only decides the ETA label.
 */
export function calculateDeliveryPromise(input: {
  product: DeliveryPromiseProductInput;
  kinguinBalance?: ProviderBalanceSnapshot | null;
  smmBalance?: ProviderBalanceSnapshot | null;
  /** When false, UNAVAILABLE instead of DELAYED when auto-fulfill cannot run. */
  allowDelayedFallback?: boolean;
}): DeliveryPromiseEstimate {
  const allowDelayed = input.allowDelayedFallback !== false;
  const { product } = input;
  const stock = Math.max(0, product.stockAvailable);

  if (product.deliveryMethod === "MANUAL") {
    if (stock >= product.quantity) {
      return {
        promise: "INSTANT",
        estimatedCostAmount: 0,
        estimatedCostCurrency: null,
        reason: "keys_available",
      };
    }
    if (allowDelayed) {
      return {
        promise: "DELAYED_12_24H",
        estimatedCostAmount: 0,
        estimatedCostCurrency: null,
        reason: "manual_inventory_short",
      };
    }
    return {
      promise: "UNAVAILABLE",
      estimatedCostAmount: 0,
      estimatedCostCurrency: null,
      reason: "manual_no_stock",
    };
  }

  if (product.deliveryMethod === "KINGUIN") {
    const cost = estimateKinguinCostEur(product);
    if (stock < product.quantity) {
      return {
        promise: allowDelayed ? "DELAYED_12_24H" : "UNAVAILABLE",
        estimatedCostAmount: cost,
        estimatedCostCurrency: "EUR",
        reason: "kinguin_no_offer_stock",
      };
    }

    const coverage = balanceCovers(input.kinguinBalance, cost);
    // Only trust balance when the official ESA endpoint returned a numeric value.
    if (coverage === "yes") {
      return {
        promise: "INSTANT",
        estimatedCostAmount: cost,
        estimatedCostCurrency: "EUR",
        reason: "kinguin_balance_ok",
      };
    }
    if (coverage === "no") {
      return {
        promise: "DELAYED_12_24H",
        estimatedCostAmount: cost,
        estimatedCostCurrency: "EUR",
        reason: "kinguin_insufficient_balance",
      };
    }
    // UNKNOWN/ERROR: do not invent funds — delay rather than block purchase.
    return {
      promise: "DELAYED_12_24H",
      estimatedCostAmount: cost,
      estimatedCostCurrency: "EUR",
      reason: "kinguin_balance_unreliable",
    };
  }

  // SMM
  const cost = estimateSmmCostUsd(product);
  if (stock <= 0 && !allowDelayed) {
    return {
      promise: "UNAVAILABLE",
      estimatedCostAmount: cost,
      estimatedCostCurrency: "USD",
      reason: "smm_no_stock",
    };
  }

  const coverage = balanceCovers(input.smmBalance, cost);
  if (coverage === "yes") {
    return {
      promise: "INSTANT",
      estimatedCostAmount: cost,
      estimatedCostCurrency: "USD",
      reason: "smm_balance_ok",
    };
  }
  if (coverage === "no") {
    return {
      promise: "DELAYED_12_24H",
      estimatedCostAmount: cost,
      estimatedCostCurrency: "USD",
      reason: "smm_insufficient_balance",
    };
  }
  return {
    promise: "DELAYED_12_24H",
    estimatedCostAmount: cost,
    estimatedCostCurrency: "USD",
    reason: "smm_balance_unreliable_or_manual",
  };
}

export function deliveryPromiseLabel(promise: DeliveryPromise): string {
  switch (promise) {
    case "INSTANT":
      return "Inmediata";
    case "DELAYED_12_24H":
      return "12–24 horas";
    case "UNAVAILABLE":
      return "No disponible";
  }
}

export function deliveryPromiseCustomerCopy(promise: DeliveryPromise): string {
  switch (promise) {
    case "INSTANT":
      return "Entrega inmediata";
    case "DELAYED_12_24H":
      return "Entrega en 12–24 horas";
    case "UNAVAILABLE":
      return "Entrega no disponible";
  }
}

export function isDelayedDeliveryPromise(
  promise: DeliveryPromise | null | undefined,
): boolean {
  return promise === "DELAYED_12_24H";
}
