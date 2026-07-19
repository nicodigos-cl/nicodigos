import type {
  DeliveryMethod,
  ProductKeyStatus,
  ProductStatus,
} from "@/generated/prisma/client";

import type { VisualProductStatus } from "@/lib/products/status";
import type { AssetDraft } from "@/types/assets";

export type ProductCategoryDto = {
  id: string;
  name: string;
  slug: string;
};

export type ProductImageDto = {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  sortOrder: number;
};

export type ProductListItemDto = {
  id: string;
  name: string;
  slug: string;
  code: string;
  description: string | null;
  coverImageUrl: string | null;
  thumbnailUrl: string | null;
  status: ProductStatus;
  visualStatus: VisualProductStatus;
  deliveryMethod: DeliveryMethod;
  price: string;
  compareAtPrice: string | null;
  basePrice: string;
  offerPrice: string | null;
  currency: string;
  qty: number;
  textQty: number | null;
  isFeatured: boolean;
  isOffer: boolean;
  isPreorder: boolean;
  stockAvailable: number;
  stockLabel: string;
  categories: ProductCategoryDto[];
  createdAt: string;
  updatedAt: string;
};

export type ProductsPageResult = {
  items: ProductListItemDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type ProductDetailDto = {
  id: string;
  name: string;
  slug: string;
  code: string;
  description: string | null;
  coverImageUrl: string | null;
  status: ProductStatus;
  visualStatus: VisualProductStatus;
  deliveryMethod: DeliveryMethod;
  price: string;
  compareAtPrice: string | null;
  currency: string;
  qty: number;
  textQty: number | null;
  isFeatured: boolean;
  isOffer: boolean;
  isPreorder: boolean;
  originalName: string | null;
  platform: string | null;
  genres: string[];
  languages: string[];
  developers: string[];
  publishers: string[];
  tags: string[];
  regionId: number | null;
  regionalLimitations: string | null;
  countryLimitation: string[];
  releaseDate: string | null;
  activationDetails: string | null;
  ageRating: string | null;
  sourceCostPrice: string | null;
  categoryIds: string[];
  categories: ProductCategoryDto[];
  images: ProductImageDto[];
  assets: AssetDraft[];
  availableKeysCount: number;
  totalKeysCount: number;
  defaultOfferAvailableQty: number | null;
  stockAvailable: number;
  stockLabel: string;
  createdAt: string;
  updatedAt: string;
};

export type ProductKeyDto = {
  id: string;
  code: string;
  status: ProductKeyStatus;
  createdAt: string;
  orderItemId: string | null;
  canRevoke: boolean;
};

export type ProductKeysPageResult = {
  items: ProductKeyDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type CategoryOptionDto = {
  id: string;
  name: string;
  slug: string;
};

/** Lightweight product card for the storefront home grid. */
export type StoreProductCardDto = {
  id: string;
  name: string;
  slug: string;
  href: string;
  imageUrl: string | null;
  price: string;
  compareAtPrice: string | null;
  currency: string;
  isOffer: boolean;
  categoryName: string | null;
  deliveryMethod: DeliveryMethod;
  deliveryPromise: "INSTANT" | "DELAYED_12_24H" | "UNAVAILABLE";
  deliveryDelayed: boolean;
};

export type StoreCatalogPageResult = {
  items: StoreProductCardDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type StoreCatalogPriceBounds = {
  min: number;
  max: number;
};

export type StoreProductImageDto = {
  id: string;
  name: string;
  src: string;
  alt: string;
  type?: "IMAGE" | "VIDEO" | "YOUTUBE";
  thumbnailUrl?: string | null;
};

export type StoreProductDetailSectionDto = {
  name: string;
  items: string[];
};

/** Storefront product detail page. */
export type StoreProductDetailDto = {
  id: string;
  name: string;
  slug: string;
  href: string;
  description: string | null;
  price: string;
  compareAtPrice: string | null;
  currency: string;
  /** True when catalog price is a rate per 1000 units (SMM). */
  priceIsPerThousand: boolean;
  isOffer: boolean;
  isPreorder: boolean;
  deliveryMethod: DeliveryMethod;
  deliveryLabel: string;
  /** Customer-facing ETA, e.g. "Inmediata" or "12–24 horas". */
  deliveryEta: string;
  /** True when delivery is promised within 12–24h. */
  deliveryDelayed: boolean;
  deliveryPromise: "INSTANT" | "DELAYED_12_24H" | "UNAVAILABLE";
  stockAvailable: number;
  stockLabel: string;
  inStock: boolean;
  maxOrderQuantity: number;
  metacriticScore: number | null;
  platform: string | null;
  genres: string[];
  languages: string[];
  developers: string[];
  publishers: string[];
  tags: string[];
  regionId: number | null;
  regionName: string | null;
  regionalLimitations: string | null;
  countryLimitation: string[];
  /** Short label for region availability in the buy panel. */
  regionAvailabilityLabel: string | null;
  activationDetails: string | null;
  ageRating: string | null;
  releaseDate: string | null;
  categories: ProductCategoryDto[];
  images: StoreProductImageDto[];
  detailSections: StoreProductDetailSectionDto[];
  smmServiceType: string | null;
  smmMin: number | null;
  smmMax: number | null;
};
