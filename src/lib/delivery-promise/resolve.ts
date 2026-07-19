import "server-only";

import { ProductKeyStatus, type DeliveryMethod } from "@/generated/prisma/client";

import {
  calculateDeliveryPromise,
  type DeliveryPromiseEstimate,
} from "@/lib/delivery-promise/calculate";
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
      offers: {
        where: { isDefault: true },
        take: 1,
        select: { availableQty: true, qty: true, textQty: true },
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
  });

  const [kinguinBalance, smmBalance] = await Promise.all([
    product.deliveryMethod === "KINGUIN"
      ? getKinguinBalance()
      : Promise.resolve(null),
    product.deliveryMethod === "SMM" && product.smmApiUrl
      ? getSmmProviderBalanceByApiUrl(product.smmApiUrl)
      : Promise.resolve(null),
  ]);

  const estimate = calculateDeliveryPromise({
    product: {
      deliveryMethod: product.deliveryMethod,
      quantity: input.quantity,
      stockAvailable: stock.available,
      sourceCostEur: product.sourceCostPrice
        ? Number.parseFloat(product.sourceCostPrice.toString())
        : null,
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
