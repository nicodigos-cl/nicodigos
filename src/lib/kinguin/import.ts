import "server-only";

import {
  DeliveryMethod,
  Prisma,
  ProductStatus,
} from "@/generated/prisma/client";

import { applyMarkupPct, eurToClp } from "@/lib/fx/eur-clp";
import { evaluateChileCompatibility } from "@/lib/kinguin/chile-compatibility";
import {
  offerAvailableQty,
  offerPersistAvailableQty,
  parseReleaseDate,
  pickCheapestOffer,
} from "@/lib/kinguin/offers";
import {
  mirrorKinguinProductImages,
  type MirroredKinguinImageAsset,
} from "@/lib/kinguin/mirror-images";
import { getKinguinClient, KinguinApiError } from "@/lib/kinguin-client";
import { createLogger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { slugify } from "@/lib/products/format";
import type { ImportKinguinProductInput } from "@/lib/validations/kinguin";
import type { KinguinProduct } from "@/types/kinguin";
import type { KinguinProductPreviewDto } from "@/types/kinguin-admin";

const log = createLogger({ module: "kinguin-import" });

async function uniqueSlug(
  tx: Prisma.TransactionClient,
  base: string,
): Promise<string> {
  let candidate = slugify(base) || "juego-kinguin";
  candidate = candidate.slice(0, 110);

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const next = attempt === 0 ? candidate : `${candidate}-${attempt + 1}`;
    const existing = await tx.product.findUnique({
      where: { slug: next },
      select: { id: true },
    });
    if (!existing) {
      return next;
    }
  }

  return `${candidate}-${Date.now().toString(36)}`;
}

export async function getKinguinProductPreview(
  kinguinId: number,
): Promise<KinguinProductPreviewDto> {
  const client = getKinguinClient();
  const product = await client.getProductByKinguinId(kinguinId);
  const existing = await prisma.product.findUnique({
    where: { kinguinId },
    select: { id: true },
  });

  const cheapest = pickCheapestOffer(product);
  const cheapestId = cheapest?.offerId ?? product.cheapestOfferId?.[0] ?? null;
  const chile = evaluateChileCompatibility({
    name: product.name,
    regionalLimitations: product.regionalLimitations,
    countryLimitation: product.countryLimitation,
  });

  return {
    kinguinId: product.kinguinId,
    productId: product.productId,
    name: product.name,
    platform: product.platform ?? null,
    description: product.description ?? null,
    coverUrl: product.images?.cover?.url ?? null,
    cheapestOfferId: cheapestId,
    priceEur:
      typeof product.price === "number" && Number.isFinite(product.price)
        ? product.price
        : (cheapest?.price ?? null),
    alreadyImported: existing != null,
    localProductId: existing?.id ?? null,
    chileCompatible: chile.compatible,
    chileWarning: chile.warning,
    regionalLimitations: product.regionalLimitations ?? null,
    countryLimitation: product.countryLimitation ?? [],
    activationDetails: product.activationDetails ?? null,
    offers: (product.offers ?? []).map((offer) => ({
      offerId: offer.offerId,
      name: offer.name ?? null,
      priceEur: offer.price,
      qty: offer.qty ?? 0,
      availableQty: offer.availableQty ?? null,
      merchantName: offer.merchantName ?? null,
      isCheapest: offer.offerId === cheapestId,
    })),
  };
}

export type KinguinLinkPayload = {
  remote: KinguinProduct;
  cheapest: NonNullable<ReturnType<typeof pickCheapestOffer>>;
  meta: ReturnType<typeof mapProductMeta>;
  costClp: number;
  availableQty: number;
};

/** Fetch remote Kinguin product and fail if already linked locally. */
export async function resolveKinguinLinkPayload(
  kinguinId: number,
): Promise<KinguinLinkPayload> {
  const client = getKinguinClient();
  let remote: KinguinProduct;

  try {
    remote = await client.getProductByKinguinId(kinguinId);
  } catch (error) {
    if (error instanceof KinguinApiError && error.status === 404) {
      throw new Error("KINGUIN_PRODUCT_NOT_FOUND");
    }
    throw error;
  }

  const existing = await prisma.product.findFirst({
    where: {
      OR: [
        { kinguinId: remote.kinguinId },
        { kinguinProductId: remote.productId },
      ],
    },
    select: { id: true },
  });

  if (existing) {
    throw new Error("KINGUIN_ALREADY_IMPORTED");
  }

  const cheapest = pickCheapestOffer(remote);
  if (!cheapest || (remote.offers ?? []).length === 0) {
    throw new Error("KINGUIN_NO_OFFERS");
  }

  const costClp = await eurToClp(cheapest.price);

  return {
    remote,
    cheapest,
    meta: mapProductMeta(remote),
    costClp,
    availableQty: offerAvailableQty(cheapest),
  };
}

export async function writeKinguinRelatedRecords(
  tx: Prisma.TransactionClient,
  productId: string,
  remote: KinguinProduct,
  defaultOfferId: string,
  options?: { imageAssets?: MirroredKinguinImageAsset[] },
) {
  const offers = remote.offers ?? [];

  if (offers.length > 0) {
    await tx.productOffer.createMany({
      data: offers.map((offer) => ({
        productId,
        kinguinOfferId: offer.offerId,
        price: offer.price,
        qty: offer.qty ?? 0,
        textQty: offer.textQty ?? offer.availableTextQty ?? 0,
        availableQty: offerPersistAvailableQty(offer),
        isPreorder: Boolean(offer.isPreorder),
        releaseDate: parseReleaseDate(offer.releaseDate),
        merchantName: offer.merchantName ?? null,
        isDefault: offer.offerId === defaultOfferId,
      })),
    });
  }

  const imageAssets = options?.imageAssets;
  if (imageAssets && imageAssets.length > 0) {
    await tx.asset.createMany({
      data: imageAssets.map((asset) => ({
        productId,
        type: "IMAGE" as const,
        url: asset.url,
        objectKey: asset.objectKey,
        thumbnailUrl: asset.thumbnailUrl,
        mimeType: asset.mimeType,
        fileName: asset.fileName,
        sizeBytes: asset.sizeBytes,
        sortOrder: asset.sortOrder,
        isCover: asset.isCover,
      })),
    });
  }

  const videos = remote.videos ?? [];
  if (videos.length > 0) {
    await tx.asset.createMany({
      data: videos
        .filter((video) => video.video_id)
        .slice(0, 8)
        .map((video, index) => ({
          productId,
          type: "YOUTUBE" as const,
          youtubeId: video.video_id as string,
          url: `https://www.youtube.com/watch?v=${video.video_id}`,
          thumbnailUrl: `https://i.ytimg.com/vi/${video.video_id}/hqdefault.jpg`,
          sortOrder: index,
        })),
    });
  }

  const requirements = remote.systemRequirements ?? [];
  if (requirements.length > 0) {
    await tx.productSystemRequirement.createMany({
      data: requirements
        .filter((item) => item.system)
        .map((item) => ({
          productId,
          system: item.system as string,
          requirements: item.requirement ?? [],
        })),
    });
  }
}

function mapProductMeta(product: KinguinProduct) {
  return {
    name: product.name,
    originalName: product.originalName ?? null,
    description: product.description ?? null,
    platform: product.platform ?? null,
    genres: product.genres ?? [],
    languages: product.languages ?? [],
    developers: product.developers ?? [],
    publishers: product.publishers ?? [],
    tags: product.tags ?? [],
    regionId: product.regionId ?? null,
    regionalLimitations: product.regionalLimitations ?? null,
    countryLimitation: product.countryLimitation ?? [],
    activationDetails: product.activationDetails ?? null,
    ageRating: product.ageRating ?? null,
    metacriticScore:
      typeof product.metacriticScore === "number"
        ? Math.round(product.metacriticScore)
        : null,
    releaseDate: parseReleaseDate(product.releaseDate),
    isPreorder: Boolean(product.isPreorder),
    coverImageUrl: product.images?.cover?.url ?? null,
  };
}

export type ImportKinguinProductResult = {
  productId: string;
  created: boolean;
};

/** Create a DRAFT Kinguin product with all offers; cheapest is default. */
export async function importKinguinProduct(
  input: ImportKinguinProductInput,
): Promise<ImportKinguinProductResult> {
  if (input.categoryIds.length > 0) {
    const count = await prisma.category.count({
      where: { id: { in: input.categoryIds } },
    });
    if (count !== input.categoryIds.length) {
      throw new Error("CATEGORY_NOT_FOUND");
    }
  }

  const { remote, cheapest, meta, costClp, availableQty } =
    await resolveKinguinLinkPayload(input.kinguinId);

  const resolvedCostClp =
    input.sourceCostPrice != null
      ? Math.round(Number.parseFloat(input.sourceCostPrice))
      : costClp;
  const sellPrice =
    input.price != null
      ? Math.round(Number.parseFloat(input.price))
      : applyMarkupPct(resolvedCostClp, input.markupPct);
  const productName = input.name?.trim() || meta.name;
  const productDescription =
    input.description !== undefined
      ? input.description.trim() || null
      : meta.description;
  const productActivationDetails =
    input.activationDetails !== undefined
      ? input.activationDetails.trim() || null
      : meta.activationDetails;
  const productRegionalLimitations =
    input.regionalLimitations !== undefined
      ? input.regionalLimitations.trim() || null
      : meta.regionalLimitations;
  const productPlatform =
    input.platform !== undefined
      ? input.platform.trim() || null
      : meta.platform;
  const productGenres =
    input.genres !== undefined ? input.genres : meta.genres;
  const productLanguages =
    input.languages !== undefined ? input.languages : meta.languages;
  const mirroredImages = await mirrorKinguinProductImages(remote);

  const productId = await prisma.$transaction(async (tx) => {
    const slug = await uniqueSlug(tx, productName);

    const created = await tx.product.create({
      data: {
        name: productName,
        slug,
        description: productDescription,
        coverImageUrl: mirroredImages.coverImageUrl,
        status: ProductStatus.DRAFT,
        deliveryMethod: DeliveryMethod.KINGUIN,
        price: sellPrice,
        currency: "CLP",
        qty: availableQty,
        textQty: cheapest.textQty ?? cheapest.availableTextQty ?? null,
        isFeatured: false,
        isOffer: false,
        isPreorder: meta.isPreorder,
        originalName: meta.originalName ?? meta.name,
        platform: productPlatform,
        genres: productGenres,
        languages: productLanguages,
        developers: meta.developers,
        publishers: meta.publishers,
        tags: meta.tags,
        regionId: meta.regionId,
        regionalLimitations: productRegionalLimitations,
        countryLimitation: meta.countryLimitation,
        activationDetails: productActivationDetails,
        ageRating: meta.ageRating,
        metacriticScore: meta.metacriticScore,
        releaseDate: meta.releaseDate,
        sourceCostPrice: resolvedCostClp,
        kinguinId: remote.kinguinId,
        kinguinProductId: remote.productId,
        kinguinOfferId: cheapest.offerId,
        kinguinMarkupPct: input.markupPct,
        kinguinSyncedAt: new Date(),
        categories:
          input.categoryIds.length > 0
            ? {
                create: input.categoryIds.map((categoryId) => ({
                  categoryId,
                })),
              }
            : undefined,
      },
      select: { id: true },
    });

    await writeKinguinRelatedRecords(
      tx,
      created.id,
      remote,
      cheapest.offerId,
      { imageAssets: mirroredImages.assets },
    );

    return created.id;
  });

  log.info(
    { productId, kinguinId: remote.kinguinId, offers: remote.offers?.length ?? 0 },
    "imported Kinguin product",
  );

  return { productId, created: true };
}
