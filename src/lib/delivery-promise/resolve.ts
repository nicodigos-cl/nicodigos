import "server-only";

import {
  ProductKeyStatus,
  type DeliveryMethod,
} from "@/generated/prisma/client";

import {
  calculateDeliveryPromise,
  type DeliveryPromiseEstimate,
} from "@/lib/delivery-promise/calculate";
import { resolveKinguinUnitCostEur } from "@/lib/delivery-promise/kinguin-cost";
import { getEurToClpRate } from "@/lib/fx/eur-clp";
import { resolvePersistedOfferQty } from "@/lib/kinguin/offers";
import { getProductStock } from "@/lib/products/stock";
import { getKinguinBalance } from "@/lib/providers/kinguin-balance";
import { getSmmProviderBalanceByApiUrl } from "@/lib/providers/smm-balance";
import prisma from "@/lib/prisma";

export type ResolveDeliveryPromiseInput = {
  productId: string;
  quantity: number;
};

export async function resolveDeliveryPromiseForProduct(
  input: ResolveDeliveryPromiseInput,
): Promise<DeliveryPromiseEstimate & { deliveryMethod: DeliveryMethod }> {
  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    select: {
      id: true,
      deliveryMethod: true,
      qty: true,
      textQty: true,
      sourceCostPrice: true,
      smmRate: true,
      smmServiceType: true,
      smmApiUrl: true,
      smmMin: true,
      smmMax: true,
      offers: {
        where: { isDefault: true },
        take: 1,
        select: {
          availableQty: true,
          qty: true,
          textQty: true,
          price: true,
        },
      },
      _count: { select: { keys: true } },
    },
  });

  if (!product) {
    return {
      deliveryMethod: "MANUAL",
      promise: "UNAVAILABLE",
      estimatedCostAmount: null,
      estimatedCostCurrency: null,
      reason: "product_not_found",
    };
  }

  const [availableKeysCount, availableAccountsCount] =
    product.deliveryMethod === "MANUAL"
      ? await Promise.all([
          prisma.productKey.count({
            where: {
              productId: product.id,
              status: ProductKeyStatus.AVAILABLE,
            },
          }),
          prisma.productAccount.count({
            where: {
              productId: product.id,
              status: ProductKeyStatus.AVAILABLE,
            },
          }),
        ])
      : [0, 0];

  const defaultOffer = product.offers[0];
  const stock = getProductStock({
    deliveryMethod: product.deliveryMethod,
    qty: product.qty,
    textQty: product.textQty,
    availableKeysCount,
    availableAccountsCount,
    totalKeysCount: product._count.keys,
    defaultOfferAvailableQty: defaultOffer
      ? resolvePersistedOfferQty(defaultOffer)
      : null,
    smmMin: product.smmMin,
    smmMax: product.smmMax,
  });

  const needsKinguinCost = product.deliveryMethod === "KINGUIN";
  const [kinguinBalance, smmBalance, eurClpRate] = await Promise.all([
    needsKinguinCost ? getKinguinBalance() : Promise.resolve(null),
    product.deliveryMethod === "SMM" && product.smmApiUrl
      ? getSmmProviderBalanceByApiUrl(product.smmApiUrl)
      : Promise.resolve(null),
    needsKinguinCost ? getEurToClpRate().catch(() => null) : Promise.resolve(null),
  ]);

  const offerPriceEur = defaultOffer
    ? Number.parseFloat(defaultOffer.price.toString())
    : null;
  const sourceCostClp = product.sourceCostPrice
    ? Number.parseFloat(product.sourceCostPrice.toString())
    : null;

  const estimate = calculateDeliveryPromise({
    product: {
      deliveryMethod: product.deliveryMethod,
      quantity: input.quantity,
      stockAvailable: stock.available,
      sourceCostEur: resolveKinguinUnitCostEur({
        offerPriceEur,
        sourceCostClp,
        eurClpRate,
      }),
      smmRateUsd: product.smmRate
        ? Number.parseFloat(product.smmRate.toString())
        : null,
      smmServiceType: product.smmServiceType,
      smmApiUrl: product.smmApiUrl,
    },
    kinguinBalance,
    smmBalance,
  });

  return { ...estimate, deliveryMethod: product.deliveryMethod };
}

export async function resolveDeliveryPromisesForLines(
  lines: Array<{ productId: string; quantity: number }>,
): Promise<Map<string, DeliveryPromiseEstimate>> {
  const results = new Map<string, DeliveryPromiseEstimate>();
  await Promise.all(
    lines.map(async (line) => {
      const key = `${line.productId}:${line.quantity}`;
      const estimate = await resolveDeliveryPromiseForProduct(line);
      results.set(key, estimate);
      results.set(line.productId, estimate);
    }),
  );
  return results;
}
