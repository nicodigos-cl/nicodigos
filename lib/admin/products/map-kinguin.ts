import { Prisma } from "@/lib/generated/prisma/client";
import { KINGUIN_SOURCE_CURRENCY } from "@/lib/currency/constants";
import { eurToClp, sellClpFromCostEur } from "@/lib/currency/convert";
import {
  extractKinguinProductGallery,
  resolveKinguinProductCoverUrl,
} from "@/lib/kinguin/product-images";
import { extractKinguinProductVideos } from "@/lib/kinguin/product-videos";
import type { ProductKinguinMetadata } from "@/lib/admin/products/kinguin-metadata";
import { ProductImageSource } from "@/lib/generated/prisma/client";
import {
  pickPrimaryOffer,
  resolveCatalogQty,
} from "@/lib/catalog/kinguin-stock";
import type { KinguinOffer, KinguinProduct } from "@/types/kinguin";

function toDecimal(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value.toFixed(2));
}

export function mapOffer(
  offer: KinguinOffer,
  isDefault: boolean,
  eurToClpRate: number,
): Prisma.ProductOfferCreateWithoutProductInput {
  const costEur = offer.price;

  return {
    kinguinOfferId: offer.offerId,
    name: offer.name,
    sourceCostPrice: toDecimal(costEur),
    sourceCurrency: KINGUIN_SOURCE_CURRENCY,
    costPrice: toDecimal(eurToClp(costEur, eurToClpRate)),
    sellPrice: toDecimal(sellClpFromCostEur(costEur, eurToClpRate)),
    qty: offer.qty ?? offer.availableQty ?? 0,
    textQty: offer.textQty ?? offer.availableTextQty ?? 0,
    merchantName: offer.merchantName ?? null,
    isPreorder: offer.isPreorder,
    releaseDate: offer.releaseDate || null,
    isDefault,
  };
}

export function mapKinguinProductToCreateInput(
  product: KinguinProduct,
  slug: string,
  eurToClpRate: number,
  metadata: ProductKinguinMetadata,
): Prisma.ProductCreateInput {
  const offers = product.offers ?? [];
  const primaryOffer = pickPrimaryOffer(product);
  const costEur = primaryOffer?.price ?? product.price;
  const qty = resolveCatalogQty(product);

  const defaultOfferId = primaryOffer?.offerId ?? offers[0]?.offerId;
  const gallery = extractKinguinProductGallery(product);
  const videos = extractKinguinProductVideos(product);

  return {
    kinguinId: product.kinguinId,
    kinguinProductId: product.productId,
    slug,
    name: product.name,
    originalName: product.originalName ?? null,
    description: product.description ?? null,
    platform: product.platform,
    genres: product.genres ?? [],
    coverImageUrl: resolveKinguinProductCoverUrl(product),
    sourceCostPrice: toDecimal(costEur),
    sourceCurrency: KINGUIN_SOURCE_CURRENCY,
    costPrice: toDecimal(eurToClp(costEur, eurToClpRate)),
    sellPrice: toDecimal(sellClpFromCostEur(costEur, eurToClpRate)),
    qty,
    isActive: false,
    isOffer: false,
    isFeatured: false,
    isPreorder: product.isPreorder,
    ...metadata,
    kinguinSyncedAt: new Date(),
    images: {
      create: gallery.map((item, index) => ({
        url: item.url,
        thumbnailUrl: item.thumbnailUrl,
        sortOrder: index,
        isCover: item.isCover,
        source: ProductImageSource.KINGUIN,
      })),
    },
    videos: {
      create: videos.map((item, index) => ({
        youtubeVideoId: item.youtubeVideoId,
        title: item.title,
        sortOrder: index,
        source: ProductImageSource.KINGUIN,
      })),
    },
    offers: {
      create: offers.map((offer) =>
        mapOffer(offer, offer.offerId === defaultOfferId, eurToClpRate),
      ),
    },
  };
}
