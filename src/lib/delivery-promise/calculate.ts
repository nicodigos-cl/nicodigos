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
 *
 * Rules:
 * - SMM → fast (minutes/hours) when balance covers; otherwise 12–24h
 * - MANUAL → always 12–24h (admin fulfillment)
 * - KINGUIN → instant with balance; 12–24h without reliable/sufficient balance
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
    if (stock < product.quantity && !allowDelayed) {
      return {
        promise: "UNAVAILABLE",
        estimatedCostAmount: 0,
        estimatedCostCurrency: null,
        reason: "manual_no_stock",
      };
    }
    return {
      promise: "DELAYED_12_24H",
      estimatedCostAmount: 0,
      estimatedCostCurrency: null,
      reason: stock >= product.quantity ? "manual_admin_delivery" : "manual_inventory_short",
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
    if (coverage === "yes") {
      return {
        promise: "INSTANT",
        estimatedCostAmount: cost,
        estimatedCostCurrency: "EUR",
        reason: "kinguin_balance_ok",
      };
    }
    return {
      promise: "DELAYED_12_24H",
      estimatedCostAmount: cost,
      estimatedCostCurrency: "EUR",
      reason:
        coverage === "no"
          ? "kinguin_insufficient_balance"
          : "kinguin_balance_unreliable",
    };
  }

  // SMM — typical start is minutes/hours when the panel can fund the order.
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
  if (coverage === "yes" || coverage === "unknown") {
    // Unknown balance: still promise the normal SMM window (minutes/hours),
    // not a fictitious 12–24h delay based on missing wallet data.
    return {
      promise: "INSTANT",
      estimatedCostAmount: cost,
      estimatedCostCurrency: "USD",
      reason:
        coverage === "yes" ? "smm_balance_ok" : "smm_fast_default",
    };
  }

  return {
    promise: "DELAYED_12_24H",
    estimatedCostAmount: cost,
    estimatedCostCurrency: "USD",
    reason: "smm_insufficient_balance",
  };
}

/** Customer-facing ETA label by method + promise. */
export function deliveryPromiseLabel(
  promise: DeliveryPromise,
  method?: DeliveryMethod | null,
): string {
  if (promise === "UNAVAILABLE") return "No disponible";

  if (method === "SMM") {
    return promise === "DELAYED_12_24H"
      ? "12–24 horas"
      : "Minutos a unas horas";
  }

  if (method === "MANUAL") {
    return "12–24 horas";
  }

  // KINGUIN / unknown method
  return promise === "INSTANT" ? "Inmediata" : "12–24 horas";
}

export function deliveryPromiseCustomerCopy(
  promise: DeliveryPromise,
  method?: DeliveryMethod | null,
): string {
  if (promise === "UNAVAILABLE") return "Entrega no disponible";

  if (method === "SMM") {
    return promise === "DELAYED_12_24H"
      ? "Entrega en 12–24 horas"
      : "Entrega en minutos a unas horas";
  }

  if (method === "MANUAL") {
    return "Entrega en 12–24 horas";
  }

  return promise === "INSTANT"
    ? "Entrega inmediata"
    : "Entrega en 12–24 horas";
}

export function isDelayedDeliveryPromise(
  promise: DeliveryPromise | null | undefined,
): boolean {
  return promise === "DELAYED_12_24H";
}
