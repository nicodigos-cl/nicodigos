import prisma from "@/lib/prisma";
import type { KinguinSystemRequirement } from "@/types/kinguin";

export type StorefrontProductImage = {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  isCover: boolean;
};

export type StorefrontProductVideo = {
  id: string;
  youtubeVideoId: string;
  title: string | null;
};

export type StorefrontProductDetail = {
  id: string;
  slug: string;
  name: string;
  platform: string;
  description: string | null;
  coverImageUrl: string | null;
  sellPrice: string;
  qty: number;
  isOffer: boolean;
  isPreorder: boolean;
  genres: string[];
  languages: string[];
  developers: string[];
  publishers: string[];
  releaseDate: string | null;
  ageRating: string | null;
  regionName: string | null;
  regionalLimitations: string | null;
  countryLimitations: string[];
  activationDetails: string | null;
  systemRequirements: KinguinSystemRequirement[];
  images: StorefrontProductImage[];
  videos: StorefrontProductVideo[];
  category: {
    name: string;
    slug: string;
  } | null;
};

function parseSystemRequirements(value: unknown): KinguinSystemRequirement[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value as KinguinSystemRequirement[];
}

export async function getStorefrontProductBySlug(
  slug: string,
): Promise<StorefrontProductDetail | null> {
  const product = await prisma.product.findFirst({
    where: {
      slug,
      isActive: true,
      qty: { gt: 0 },
    },
    select: {
      id: true,
      slug: true,
      name: true,
      platform: true,
      description: true,
      coverImageUrl: true,
      sellPrice: true,
      qty: true,
      isOffer: true,
      isPreorder: true,
      genres: true,
      languages: true,
      developers: true,
      publishers: true,
      releaseDate: true,
      ageRating: true,
      regionName: true,
      regionalLimitations: true,
      countryLimitations: true,
      activationDetails: true,
      systemRequirements: true,
      images: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          url: true,
          thumbnailUrl: true,
          isCover: true,
        },
      },
      videos: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          youtubeVideoId: true,
          title: true,
        },
      },
      category: {
        select: {
          name: true,
          slug: true,
        },
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
    platform: product.platform,
    description: product.description,
    coverImageUrl: product.coverImageUrl,
    sellPrice: product.sellPrice.toString(),
    qty: product.qty,
    isOffer: product.isOffer,
    isPreorder: product.isPreorder,
    genres: product.genres,
    languages: product.languages,
    developers: product.developers,
    publishers: product.publishers,
    releaseDate: product.releaseDate,
    ageRating: product.ageRating,
    regionName: product.regionName,
    regionalLimitations: product.regionalLimitations,
    countryLimitations: product.countryLimitations,
    activationDetails: product.activationDetails,
    systemRequirements: parseSystemRequirements(product.systemRequirements),
    images: product.images,
    videos: product.videos,
    category: product.category,
  };
}
