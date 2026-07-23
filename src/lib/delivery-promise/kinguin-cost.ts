/**
 * Resolve unit Kinguin cost in EUR for balance checks.
 *
 * Prefer the default offer price (already EUR from Kinguin ESA).
 * Fall back to converting `sourceCostPrice` (stored in CLP) with FX.
 */
export function resolveKinguinUnitCostEur(input: {
  offerPriceEur?: number | null;
  sourceCostClp?: number | null;
  eurClpRate?: number | null;
}): number | null {
  const offer = input.offerPriceEur;
  if (offer != null && Number.isFinite(offer) && offer >= 0) {
    return offer;
  }

  const clp = input.sourceCostClp;
  const rate = input.eurClpRate;
  if (
    clp == null ||
    rate == null ||
    !Number.isFinite(clp) ||
    clp < 0 ||
    !Number.isFinite(rate) ||
    rate <= 0
  ) {
    return null;
  }

  return clp / rate;
}
