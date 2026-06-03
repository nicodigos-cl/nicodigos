import { DEFAULT_MARKUP } from "@/lib/currency/constants";

/** Round to whole Chilean pesos. */
export function roundClp(amount: number): number {
  return Math.round(amount);
}

export function eurToClp(amountEur: number, rate: number): number {
  return roundClp(amountEur * rate);
}

export function sellClpFromCostEur(costEur: number, rate: number): number {
  return eurToClp(costEur * DEFAULT_MARKUP, rate);
}
