/**
 * Volume discount config and calculation helpers.
 * Applies a volume discount for standard products (non-SMM).
 */

export type VolumeDiscountTier = {
  minQuantity: number;
  discountPct: number; // e.g. 0.05 for 5%
};

export const VOLUME_DISCOUNT_TIERS: VolumeDiscountTier[] = [
  { minQuantity: 3, discountPct: 0.05 }, // 5% discount for 3-4 items
  { minQuantity: 5, discountPct: 0.10 }, // 10% discount for 5+ items
];

export function getVolumeDiscountPct(quantity: number, isSmm: boolean): number {
  if (isSmm) return 0;

  let bestDiscount = 0;
  for (const tier of VOLUME_DISCOUNT_TIERS) {
    if (quantity >= tier.minQuantity) {
      bestDiscount = Math.max(bestDiscount, tier.discountPct);
    }
  }
  return bestDiscount;
}

export function calculateVolumeDiscountPrice(
  basePrice: number,
  quantity: number,
  isSmm: boolean
): { unitPrice: number; lineTotal: number; discountPct: number } {
  const discountPct = getVolumeDiscountPct(quantity, isSmm);
  const unitPrice = basePrice * (1 - discountPct);
  const lineTotal = unitPrice * quantity;
  return {
    unitPrice: Math.round(unitPrice),
    lineTotal: Math.round(lineTotal),
    discountPct,
  };
}
