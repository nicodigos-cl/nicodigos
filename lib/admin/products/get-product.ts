import type { KinguinSystemRequirement } from "@/types/kinguin";
import prisma from "@/lib/prisma";

export type AdminProductOfferEdit = {
  id: string;
  name: string;
  merchantName: string | null;
  sourceCostPrice: string | null;
  sourceCurrency: string;
  costPrice: string;
  sellPrice: string;
  qty: number;
  textQty: number;
  isPreorder: boolean;
  releaseDate: string | null;
  isDefault: boolean;
};

export type AdminProductImageEdit = {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  sortOrder: number;
  isCover: boolean;
  source: "KINGUIN" | "MANUAL";
};

export type AdminProductVideoEdit = {
  id: string;
  youtubeVideoId: string;
  title: string | null;
  sortOrder: number;
  source: "KINGUIN" | "MANUAL";
};

export type AdminProductEditData = {
  id: string;
  slug: string;
  name: string;
  originalName: string | null;
  description: string | null;
  platform: string;
  kinguinId: number;
  kinguinProductId: string;
  coverImageUrl: string | null;
  sourceCostPrice: string | null;
  sourceCurrency: string;
  costPrice: string;
  sellPrice: string;
  qty: number;
  isActive: boolean;
  isPreorder: boolean;
  regionalLimitations: string | null;
  regionId: number | null;
  regionName: string | null;
  countryLimitations: string[];
  activationDetails: string | null;
  languages: string[];
  developers: string[];
  publishers: string[];
  releaseDate: string | null;
  ageRating: string | null;
  systemRequirements: KinguinSystemRequirement[];
  steamAppId: string | null;
  images: AdminProductImageEdit[];
  videos: AdminProductVideoEdit[];
  offers: AdminProductOfferEdit[];
};

function parseSystemRequirements(value: unknown): KinguinSystemRequirement[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value as KinguinSystemRequirement[];
}

export async function getAdminProductForEdit(
  id: string,
): Promise<AdminProductEditData | null> {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      videos: { orderBy: { sortOrder: "asc" } },
      offers: {
        orderBy: [{ isDefault: "desc" }, { sellPrice: "asc" }],
      },
    },
  });

  if (!product) {
    return null;
  }

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    originalName: product.originalName,
    description: product.description,
    platform: product.platform,
    kinguinId: product.kinguinId,
    kinguinProductId: product.kinguinProductId,
    coverImageUrl: product.coverImageUrl,
    sourceCostPrice: product.sourceCostPrice?.toString() ?? null,
    sourceCurrency: product.sourceCurrency,
    costPrice: product.costPrice.toString(),
    sellPrice: product.sellPrice.toString(),
    qty: product.qty,
    isActive: product.isActive,
    isPreorder: product.isPreorder,
    regionalLimitations: product.regionalLimitations,
    regionId: product.regionId,
    regionName: product.regionName,
    countryLimitations: product.countryLimitations,
    activationDetails: product.activationDetails,
    languages: product.languages,
    developers: product.developers,
    publishers: product.publishers,
    releaseDate: product.releaseDate,
    ageRating: product.ageRating,
    systemRequirements: parseSystemRequirements(product.systemRequirements),
    steamAppId: product.steamAppId,
    images: product.images.map((image) => ({
      id: image.id,
      url: image.url,
      thumbnailUrl: image.thumbnailUrl,
      sortOrder: image.sortOrder,
      isCover: image.isCover,
      source: image.source,
    })),
    videos: product.videos.map((video) => ({
      id: video.id,
      youtubeVideoId: video.youtubeVideoId,
      title: video.title,
      sortOrder: video.sortOrder,
      source: video.source,
    })),
    offers: product.offers.map((offer) => ({
      id: offer.id,
      name: offer.name,
      merchantName: offer.merchantName,
      sourceCostPrice: offer.sourceCostPrice?.toString() ?? null,
      sourceCurrency: offer.sourceCurrency,
      costPrice: offer.costPrice.toString(),
      sellPrice: offer.sellPrice.toString(),
      qty: offer.qty,
      textQty: offer.textQty,
      isPreorder: offer.isPreorder,
      releaseDate: offer.releaseDate,
      isDefault: offer.isDefault,
    })),
  };
}
