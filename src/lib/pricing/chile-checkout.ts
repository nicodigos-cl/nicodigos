/** Chile storefront pricing helpers (IVA-inclusive catalog prices). */

/** General IVA rate (SII). Catalog prices are assumed tax-inclusive. */
export const CHILE_IVA_RATE = 0.19;

/**
 * Flow.cl card / wallet base rate (abono al 3.er día hábil).
 * Source: https://web.flow.cl/es-cl/tarifas/ — 2,89% + IVA, $0 fijo.
 * Next-day settlement is 3,19% + IVA.
 */
export const FLOW_FEE_RATE_BASE = 0.0289;

/** Effective Flow fee including IVA on the commission: 2,89% × 1,19 ≈ 3,44%. */
export const FLOW_FEE_RATE_EFFECTIVE =
  FLOW_FEE_RATE_BASE * (1 + CHILE_IVA_RATE);

/** @deprecated Use FLOW_FEE_RATE_EFFECTIVE — kept as alias for call sites. */
export const FLOW_FEE_RATE = FLOW_FEE_RATE_EFFECTIVE;

export const FLOW_FEE_LABEL = "2,89% + IVA";

export type ChileCheckoutBreakdown = {
  /** Customer total (IVA included). */
  total: number;
  /** Price without IVA: total / (1 + IVA). */
  net: number;
  /** IVA portion embedded in total. */
  iva: number;
  /** Estimated Flow fee on total incl. IVA on commission (merchant cost). */
  flowFee: number;
};

export function parseClpAmount(value: string | number): number {
  const parsed =
    typeof value === "number"
      ? value
      : Number.parseFloat(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Split an IVA-inclusive CLP total into neto, IVA, and estimated Flow fee.
 * Does not change what the customer pays.
 */
export function chileCheckoutBreakdown(
  totalInclusive: string | number,
): ChileCheckoutBreakdown {
  const total = Math.max(0, Math.round(parseClpAmount(totalInclusive)));
  const net = Math.round(total / (1 + CHILE_IVA_RATE));
  const iva = Math.max(0, total - net);
  const flowFee = Math.round(total * FLOW_FEE_RATE_EFFECTIVE);
  return { total, net, iva, flowFee };
}
