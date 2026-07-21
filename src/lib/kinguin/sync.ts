import "server-only";

import {
  DeliveryMethod,
  ProductStatus,
} from "@/generated/prisma/client";

import { computePriceChangeMetrics } from "@/lib/events/price-change";
import { applyMarkupPct, eurToClp } from "@/lib/fx/eur-clp";
import {
  offerAvailableQty,
  offerPersistAvailableQty,
  parseReleaseDate,
  pickCheapestOffer,
} from "@/lib/kinguin/offers";
import { getKinguinClient, KinguinApiError } from "@/lib/kinguin-client";
import { createLogger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import type { KinguinProduct } from "@/types/kinguin";

const log = createLogger({ module: "kinguin-sync" });

export type SyncKinguinProductResult = {
  productId: string;
  kinguinId: number;
  status: "synced" | "archived" | "error" | "skipped";
  offersUpserted: number;
  offersRemoved: number;
  repriced: boolean;
  detailsUpdated: boolean;
  error?: string;
};

export type SyncAllKinguinProductsResult = {
  products: number;
  results: SyncKinguinProductResult[];
  totals: {
    synced: number;
    archived: number;
    errors: number;
    skipped: number;
    repriced: number;
  };
};

function mapRemoteMeta(remote: KinguinProduct) {
  return {
    originalName: remote.originalName ?? remote.name,
    platform: remote.platform ?? null,
    genres: remote.genres ?? [],
    languages: remote.languages ?? [],
    developers: remote.developers ?? [],
    publishers: remote.publishers ?? [],
    tags: remote.tags ?? [],
    regionId: remote.regionId ?? null,
    regionalLimitations: remote.regionalLimitations ?? null,
    countryLimitation: remote.countryLimitation ?? [],
    activationDetails: remote.activationDetails ?? null,
    ageRating: remote.ageRating ?? null,
    metacriticScore:
      typeof remote.metacriticScore === "number"
        ? Math.round(remote.metacriticScore)
        : null,
    releaseDate: parseReleaseDate(remote.releaseDate),
  };
}

async function syncOneProduct(product: {
  id: string;
  kinguinId: number;
  price: { toString(): string };
  currency: string;
  kinguinMarkupPct: { toString(): string } | null;
  status: ProductStatus;
}): Promise<SyncKinguinProductResult> {
  const client = getKinguinClient();
  const base: SyncKinguinProductResult = {
    productId: product.id,
    kinguinId: product.kinguinId,
    status: "synced",
    offersUpserted: 0,
    offersRemoved: 0,
    repriced: false,
    detailsUpdated: false,
  };

  let remote;
  try {
    remote = await client.getProductByKinguinId(product.kinguinId);
  } catch (error) {
    if (error instanceof KinguinApiError && error.status === 404) {
      await prisma.product.update({
        where: { id: product.id },
        data: {
          status: ProductStatus.ARCHIVED,
          kinguinSyncedAt: new Date(),
        },
      });
      return { ...base, status: "archived" };
    }

    const message =
      error instanceof Error ? error.message.slice(0, 500) : "sync failed";
    log.error(
      { err: error, productId: product.id, kinguinId: product.kinguinId },
      "kinguin product sync failed",
    );
    return { ...base, status: "error", error: message };
  }

  const offers = remote.offers ?? [];
  const cheapest = offers.length > 0 ? pickCheapestOffer(remote) : null;
  const meta = mapRemoteMeta(remote);

  if (!cheapest || offers.length === 0) {
    await prisma.product.update({
      where: { id: product.id },
      data: {
        status: ProductStatus.ARCHIVED,
        qty: 0,
        kinguinSyncedAt: new Date(),
        ...meta,
      },
    });
    return { ...base, status: "archived", detailsUpdated: true };
  }

  const remoteOfferIds = offers.map((offer) => offer.offerId);
  const available = offerAvailableQty(cheapest);
  const costClp = await eurToClp(cheapest.price);

  const markupPct = Number.parseFloat(
    product.kinguinMarkupPct?.toString() ?? "",
  );
  const hasMarkup = Number.isFinite(markupPct);
  const currentPrice = Number.parseFloat(product.price.toString());
  const nextPrice = hasMarkup
    ? applyMarkupPct(costClp, markupPct)
    : currentPrice;
  const shouldReprice =
    hasMarkup &&
    Number.isFinite(currentPrice) &&
    Number.isFinite(nextPrice) &&
    currentPrice !== nextPrice;

  await prisma.$transaction(async (tx) => {
    for (const offer of offers) {
      await tx.productOffer.upsert({
        where: { kinguinOfferId: offer.offerId },
        create: {
          productId: product.id,
          kinguinOfferId: offer.offerId,
          price: offer.price,
          qty: offer.qty ?? 0,
          textQty: offer.textQty ?? offer.availableTextQty ?? 0,
          availableQty: offerPersistAvailableQty(offer),
          isPreorder: Boolean(offer.isPreorder),
          releaseDate: parseReleaseDate(offer.releaseDate),
          merchantName: offer.merchantName ?? null,
          isDefault: offer.offerId === cheapest.offerId,
        },
        update: {
          productId: product.id,
          price: offer.price,
          qty: offer.qty ?? 0,
          textQty: offer.textQty ?? offer.availableTextQty ?? 0,
          availableQty: offerPersistAvailableQty(offer),
          isPreorder: Boolean(offer.isPreorder),
          releaseDate: parseReleaseDate(offer.releaseDate),
          merchantName: offer.merchantName ?? null,
          isDefault: offer.offerId === cheapest.offerId,
        },
      });
    }

    const removed = await tx.productOffer.deleteMany({
      where: {
        productId: product.id,
        kinguinOfferId: { notIn: remoteOfferIds },
      },
    });

    base.offersUpserted = offers.length;
    base.offersRemoved = removed.count;

    await tx.productOffer.updateMany({
      where: {
        productId: product.id,
        kinguinOfferId: { not: cheapest.offerId },
      },
      data: { isDefault: false },
    });
    await tx.productOffer.updateMany({
      where: {
        productId: product.id,
        kinguinOfferId: cheapest.offerId,
      },
      data: { isDefault: true },
    });

    if (shouldReprice) {
      const metrics = computePriceChangeMetrics(currentPrice, nextPrice);
      if (metrics) {
        await tx.productPriceChangeEvent.create({
          data: {
            productId: product.id,
            source: "kinguin.offer.price_changed",
            oldPrice: currentPrice,
            newPrice: nextPrice,
            currency: product.currency || "CLP",
            changePct: metrics.changePct,
            direction: metrics.direction,
          },
        });
      }
      base.repriced = true;
    }

    const nextStatus =
      available <= 0
        ? ProductStatus.ARCHIVED
        : product.status === ProductStatus.ARCHIVED
          ? ProductStatus.ARCHIVED
          : product.status;

    await tx.product.update({
      where: { id: product.id },
      data: {
        kinguinProductId: remote.productId,
        kinguinOfferId: cheapest.offerId,
        kinguinSyncedAt: new Date(),
        qty: available,
        textQty: cheapest.textQty ?? cheapest.availableTextQty ?? null,
        isPreorder: Boolean(remote.isPreorder ?? cheapest.isPreorder),
        sourceCostPrice: costClp,
        status: nextStatus,
        ...meta,
        ...(shouldReprice ? { price: nextPrice } : {}),
      },
    });
    base.detailsUpdated = true;
  });

  if (available <= 0) {
    return { ...base, status: "archived" };
  }

  return base;
}

const productSyncSelect = {
  id: true,
  kinguinId: true,
  price: true,
  currency: true,
  kinguinMarkupPct: true,
  status: true,
} as const;

/** Sync one locally imported Kinguin product (offers, cost, region/details). */
export async function syncKinguinProductById(
  productId: string,
): Promise<SyncKinguinProductResult> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: productSyncSelect,
  });

  if (!product || product.kinguinId == null) {
    return {
      productId,
      kinguinId: 0,
      status: "skipped",
      offersUpserted: 0,
      offersRemoved: 0,
      repriced: false,
      detailsUpdated: false,
      error: "Producto no es Kinguin o no tiene kinguinId",
    };
  }

  return syncOneProduct({
    id: product.id,
    kinguinId: product.kinguinId,
    price: product.price,
    currency: product.currency,
    kinguinMarkupPct: product.kinguinMarkupPct,
    status: product.status,
  });
}

/** Sync selected Kinguin products by id. */
export async function syncKinguinProductsByIds(
  productIds: string[],
): Promise<SyncAllKinguinProductsResult> {
  const products = await prisma.product.findMany({
    where: {
      id: { in: productIds },
      deliveryMethod: DeliveryMethod.KINGUIN,
      kinguinId: { not: null },
    },
    select: productSyncSelect,
  });

  const byId = new Map(products.map((item) => [item.id, item]));
  const results: SyncKinguinProductResult[] = [];

  for (const productId of productIds) {
    const product = byId.get(productId);
    if (!product || product.kinguinId == null) {
      results.push({
        productId,
        kinguinId: 0,
        status: "skipped",
        offersUpserted: 0,
        offersRemoved: 0,
        repriced: false,
        detailsUpdated: false,
        error: "No es producto Kinguin",
      });
      continue;
    }

    results.push(
      await syncOneProduct({
        id: product.id,
        kinguinId: product.kinguinId,
        price: product.price,
        currency: product.currency,
        kinguinMarkupPct: product.kinguinMarkupPct,
        status: product.status,
      }),
    );
  }

  const totals = results.reduce(
    (acc, item) => {
      if (item.status === "synced") acc.synced += 1;
      if (item.status === "archived") acc.archived += 1;
      if (item.status === "error") acc.errors += 1;
      if (item.status === "skipped") acc.skipped += 1;
      if (item.repriced) acc.repriced += 1;
      return acc;
    },
    { synced: 0, archived: 0, errors: 0, skipped: 0, repriced: 0 },
  );

  return {
    products: results.length,
    results,
    totals,
  };
}

/** Sync all locally imported Kinguin products (not the full remote catalog). */
export async function syncAllKinguinProducts(): Promise<SyncAllKinguinProductsResult> {
  const products = await prisma.product.findMany({
    where: {
      deliveryMethod: DeliveryMethod.KINGUIN,
      kinguinId: { not: null },
    },
    select: productSyncSelect,
    orderBy: { updatedAt: "asc" },
  });

  const results: SyncKinguinProductResult[] = [];

  for (const product of products) {
    if (product.kinguinId == null) continue;
    const result = await syncOneProduct({
      id: product.id,
      kinguinId: product.kinguinId,
      price: product.price,
      currency: product.currency,
      kinguinMarkupPct: product.kinguinMarkupPct,
      status: product.status,
    });
    results.push(result);
  }

  const totals = results.reduce(
    (acc, item) => {
      if (item.status === "synced") acc.synced += 1;
      if (item.status === "archived") acc.archived += 1;
      if (item.status === "error") acc.errors += 1;
      if (item.status === "skipped") acc.skipped += 1;
      if (item.repriced) acc.repriced += 1;
      return acc;
    },
    { synced: 0, archived: 0, errors: 0, skipped: 0, repriced: 0 },
  );

  log.info(
    { products: products.length, totals },
    "kinguin products sync finished",
  );

  return {
    products: products.length,
    results,
    totals,
  };
}
