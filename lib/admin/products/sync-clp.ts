import "server-only";

import { Prisma } from "@/lib/generated/prisma/client";
import { eurToClp, sellClpFromCostEur } from "@/lib/currency/convert";
import prisma from "@/lib/prisma";

function toDecimal(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value.toFixed(2));
}

/** CLP stored as if it were EUR (pre-conversion imports). */
export function isLikelyEurStoredAsClp(
  sourceCostEur: number,
  costClp: number,
): boolean {
  if (!Number.isFinite(sourceCostEur) || sourceCostEur <= 0.5) {
    return false;
  }
  if (!Number.isFinite(costClp) || costClp <= 0) {
    return true;
  }
  // Real CLP is orders of magnitude above EUR (rate usually 900–1200).
  return costClp < sourceCostEur * 100;
}

function clpPairFromSourceEur(
  sourceEur: number,
  rate: number,
): { costPrice: Prisma.Decimal; sellPrice: Prisma.Decimal } {
  return {
    costPrice: toDecimal(eurToClp(sourceEur, rate)),
    sellPrice: toDecimal(sellClpFromCostEur(sourceEur, rate)),
  };
}

type ProductWithOffers = {
  id: string;
  sourceCostPrice: Prisma.Decimal | null;
  costPrice: Prisma.Decimal;
  sellPrice: Prisma.Decimal;
  offers: {
    id: string;
    sourceCostPrice: Prisma.Decimal | null;
    costPrice: Prisma.Decimal;
    sellPrice: Prisma.Decimal;
  }[];
};

function productNeedsClpSync(product: ProductWithOffers): boolean {
  const productSource = product.sourceCostPrice
    ? Number(product.sourceCostPrice.toString())
    : null;

  if (
    productSource != null &&
    isLikelyEurStoredAsClp(productSource, Number(product.costPrice.toString()))
  ) {
    return true;
  }

  return product.offers.some((offer) => {
    const source = offer.sourceCostPrice
      ? Number(offer.sourceCostPrice.toString())
      : null;
    if (source == null) {
      return false;
    }
    return isLikelyEurStoredAsClp(source, Number(offer.costPrice.toString()));
  });
}

export async function syncProductClpFromSourceIfNeeded(
  productId: string,
  rate: number,
): Promise<boolean> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { offers: true },
  });

  if (!product || !productNeedsClpSync(product)) {
    return false;
  }

  const productSource = product.sourceCostPrice
    ? Number(product.sourceCostPrice.toString())
    : null;

  const ops: Prisma.PrismaPromise<unknown>[] = [];

  if (
    productSource != null &&
    isLikelyEurStoredAsClp(productSource, Number(product.costPrice.toString()))
  ) {
    ops.push(
      prisma.product.update({
        where: { id: productId },
        data: clpPairFromSourceEur(productSource, rate),
      }),
    );
  }

  for (const offer of product.offers) {
    const source = offer.sourceCostPrice
      ? Number(offer.sourceCostPrice.toString())
      : null;
    if (source == null) {
      continue;
    }
    if (!isLikelyEurStoredAsClp(source, Number(offer.costPrice.toString()))) {
      continue;
    }
    ops.push(
      prisma.productOffer.update({
        where: { id: offer.id },
        data: clpPairFromSourceEur(source, rate),
      }),
    );
  }

  if (ops.length > 0) {
    await prisma.$transaction(ops);
  }

  return true;
}

/** Fixes every catalog row that still has EUR amounts in CLP columns. */
export async function syncAllProductsClpFromSourceIfNeeded(
  rate: number,
): Promise<number> {
  const products = await prisma.product.findMany({
    include: { offers: true },
  });

  let fixed = 0;
  for (const product of products) {
    if (!productNeedsClpSync(product)) {
      continue;
    }
    await syncProductClpFromSourceIfNeeded(product.id, rate);
    fixed += 1;
  }
  return fixed;
}
