import { mapOffer } from "@/lib/admin/products/map-kinguin";
import { mapKinguinProductMetadata } from "@/lib/admin/products/kinguin-metadata";
import {
  pickPrimaryOffer,
  productHasStockableOffers,
  resolveCatalogQty,
} from "@/lib/catalog/kinguin-stock";
import { eurToClp, sellClpFromCostEur } from "@/lib/currency/convert";
import { Prisma } from "@/lib/generated/prisma/client";
import { getKinguinSdk } from "@/lib/kinguin/client";
import {
  formatKinguinError,
  isKinguinProductNotFoundError,
} from "@/lib/kinguin/errors";
import prisma from "@/lib/prisma";
import type { KinguinProduct } from "@/types/kinguin";

function toDecimal(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value.toFixed(2));
}

export type SyncProductFromKinguinResult =
  | {
      ok: true;
      productId: string;
      qty: number;
      offersCount: number;
      hadStock: boolean;
      previousQty: number;
    }
  | { ok: false; productId: string; error: string };

function primaryPricing(
  kinguin: KinguinProduct,
  eurToClpRate: number,
): {
  sourceCostPrice: Prisma.Decimal | null;
  costPrice: Prisma.Decimal;
  sellPrice: Prisma.Decimal;
} {
  const primary = pickPrimaryOffer(kinguin);
  const costEur = primary?.price ?? kinguin.price;

  if (!Number.isFinite(costEur) || costEur <= 0) {
    return {
      sourceCostPrice: null,
      costPrice: toDecimal(0),
      sellPrice: toDecimal(0),
    };
  }

  return {
    sourceCostPrice: toDecimal(costEur),
    costPrice: toDecimal(eurToClp(costEur, eurToClpRate)),
    sellPrice: toDecimal(sellClpFromCostEur(costEur, eurToClpRate)),
  };
}

export async function syncProductFromKinguin(
  productId: string,
  eurToClpRate: number,
): Promise<SyncProductFromKinguinResult> {
  const existing = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      qty: true,
      kinguinProductId: true,
    },
  });

  if (!existing) {
    return { ok: false, productId, error: "Producto no encontrado." };
  }

  try {
    const kinguin = await getKinguinSdk().getProduct(existing.kinguinProductId);
    const metadata = await mapKinguinProductMetadata(kinguin);
    const offers = kinguin.offers ?? [];
    const defaultOffer = pickPrimaryOffer(kinguin);
    const defaultOfferId = defaultOffer?.offerId ?? offers[0]?.offerId;
    const qty = resolveCatalogQty(kinguin);
    const pricing = primaryPricing(kinguin, eurToClpRate);
    const incomingOfferIds = offers.map((offer) => offer.offerId);

    await prisma.$transaction(async (tx) => {
      if (incomingOfferIds.length > 0) {
        await tx.productOffer.deleteMany({
          where: {
            productId,
            kinguinOfferId: { notIn: incomingOfferIds },
          },
        });
      } else {
        await tx.productOffer.deleteMany({ where: { productId } });
      }

      for (const offer of offers) {
        const mapped = mapOffer(
          offer,
          offer.offerId === defaultOfferId,
          eurToClpRate,
        );

        await tx.productOffer.upsert({
          where: { kinguinOfferId: offer.offerId },
          create: {
            productId,
            ...mapped,
          },
          update: mapped,
        });
      }

      await tx.product.update({
        where: { id: productId },
        data: {
          name: kinguin.name,
          originalName: kinguin.originalName ?? null,
          platform: kinguin.platform,
          genres: kinguin.genres ?? [],
          qty,
          isPreorder: kinguin.isPreorder,
          ...metadata,
          ...pricing,
          kinguinSyncedAt: new Date(),
        },
      });
    });

    return {
      ok: true,
      productId,
      qty,
      offersCount: offers.length,
      hadStock: productHasStockableOffers(kinguin),
      previousQty: existing.qty,
    };
  } catch (error) {
    if (isKinguinProductNotFoundError(error)) {
      // Kinguin ya no tiene el producto: agotar stock, avanzar cursor de sync
      // para que no monopolice el batch cada 15 min.
      await prisma.$transaction(async (tx) => {
        await tx.productOffer.deleteMany({ where: { productId } });
        await tx.product.update({
          where: { id: productId },
          data: {
            qty: 0,
            kinguinSyncedAt: new Date(),
          },
        });
      });

      return {
        ok: true,
        productId,
        qty: 0,
        offersCount: 0,
        hadStock: false,
        previousQty: existing.qty,
      };
    }

    return {
      ok: false,
      productId,
      error: formatKinguinError(error),
    };
  }
}
