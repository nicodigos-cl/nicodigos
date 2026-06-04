import type { StorefrontCategory } from "@/lib/store/categories/queries";
import type { StorefrontNavCategory } from "@/lib/store/categories/queries";

/** Product card fields derived from Prisma `Product` + optional `ProductOffer`. */
export type StorefrontProductOffer = {
  sellPrice: string;
  qty: number;
  isPreorder: boolean;
};

export type StorefrontProductCard = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  platform: string;
  genres: string[];
  coverImageUrl: string | null;
  sellPrice: string;
  listPrice: string | null;
  discountPercent: number | null;
  qty: number;
  isOffer: boolean;
  isPreorder: boolean;
  releaseDate: string | null;
  regionName: string | null;
  languages: string[];
  developers: string[];
  publishers: string[];
  offer: StorefrontProductOffer | null;
};

export type StorefrontProductCardsPage = {
  products: StorefrontProductCard[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type HomePageData = {
  categories: StorefrontCategory[];
  navCategories: StorefrontNavCategory[];
  heroProducts: StorefrontProductCard[];
  featuredProducts: StorefrontProductCard[];
  offerProducts: StorefrontProductCard[];
  preorderProducts: StorefrontProductCard[];
};
