import type { Prisma } from "@/lib/generated/prisma/client";

/** Select compartido para listados que usan `StorefrontProductCardView`. */
export const storefrontProductCardSelect = {
  id: true,
  slug: true,
  name: true,
  description: true,
  platform: true,
  genres: true,
  coverImageUrl: true,
  sellPrice: true,
  costPrice: true,
  qty: true,
  isOffer: true,
  isPreorder: true,
  releaseDate: true,
  regionName: true,
  languages: true,
  developers: true,
  publishers: true,
  offers: {
    orderBy: [{ isDefault: "desc" as const }, { sellPrice: "asc" as const }],
    take: 1,
    select: {
      sellPrice: true,
      qty: true,
      isPreorder: true,
    },
  },
} satisfies Prisma.ProductSelect;
