import type {
  DeliveryMethod,
  ProductKeyStatus,
  ProductStatus,
} from "@/generated/prisma/client";

import type { VisualProductStatus } from "@/lib/products/status";

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
