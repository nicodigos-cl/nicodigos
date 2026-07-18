import { PriceChangeDirection, Prisma } from "@/generated/prisma/client";

export type PriceChangeMetrics = {
  changePct: Prisma.Decimal;
  direction: PriceChangeDirection;
};

/**
 * Relative change ((new - old) / old) * 100.
 * If old is 0 and new > 0, treat as +100% UP.
 */
export function computePriceChangeMetrics(
  oldPrice: number,
  newPrice: number,
): PriceChangeMetrics | null {
  if (!Number.isFinite(oldPrice) || !Number.isFinite(newPrice)) {
    return null;
  }
  if (oldPrice === newPrice) {
    return null;
  }

  let changePct: number;
  if (oldPrice === 0) {
    changePct = newPrice > 0 ? 100 : 0;
  } else {
    changePct = ((newPrice - oldPrice) / oldPrice) * 100;
  }

  const direction =
    newPrice > oldPrice ? PriceChangeDirection.UP : PriceChangeDirection.DOWN;

  return {
    changePct: new Prisma.Decimal(changePct.toFixed(4)),
    direction,
  };
}
