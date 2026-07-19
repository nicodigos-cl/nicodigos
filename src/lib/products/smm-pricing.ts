/** Pure SMM storefront pricing helpers (safe for client + server). */

import {
  normalizeSmmServiceKind,
  type SmmServiceKind,
} from "@/lib/validations/smm-order-fields";

/** Service kinds billed as a flat catalog price (not scaled by /1000). */
const FLAT_PRICE_KINDS = new Set<SmmServiceKind>([
  "package",
  "subscriptions",
]);

export function smmUsesPerThousandPricing(
  serviceType: string | null | undefined,
): boolean {
  const kind = normalizeSmmServiceKind(serviceType);
  return !FLAT_PRICE_KINDS.has(kind);
}

/**
 * Catalog `price` for SMM is the CLP rate per 1000 units (after markup),
 * except package/subscription kinds which use a flat price.
 */
export function estimateSmmLineTotalClp(
  catalogPriceClp: number,
  serviceType: string | null | undefined,
  quantity: number,
): number {
  if (!Number.isFinite(catalogPriceClp) || catalogPriceClp < 0) {
    return 0;
  }
  const qty = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;

  if (!smmUsesPerThousandPricing(serviceType)) {
    return Math.round(catalogPriceClp);
  }

  return Math.round((catalogPriceClp / 1000) * qty);
}

/** Effective unit price so unitPrice × quantity ≈ line total. */
export function smmEffectiveUnitPriceClp(
  catalogPriceClp: number,
  serviceType: string | null | undefined,
  quantity: number,
): number {
  const qty = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
  const lineTotal = estimateSmmLineTotalClp(
    catalogPriceClp,
    serviceType,
    qty,
  );
  return Math.round((lineTotal / qty) * 100) / 100;
}

export function buildQuantityPresets(
  min: number,
  max: number,
): number[] {
  const lo = Math.max(1, Math.floor(min));
  const hi = Math.max(lo, Math.floor(max));
  const candidates = [
    lo,
    100,
    500,
    1_000,
    2_000,
    5_000,
    10_000,
    25_000,
    50_000,
    100_000,
    250_000,
    500_000,
    1_000_000,
    hi,
  ];

  const unique = [...new Set(candidates.filter((n) => n >= lo && n <= hi))];
  return unique.slice(0, 10);
}
