import type { AssetDraft } from "@/types/assets";

export type CategoryListItemDto = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  parentId: string | null;
  parentName: string | null;
  productsCount: number;
  childrenCount: number;
  createdAt: string;
  updatedAt: string;
  assets: AssetDraft[];
};

export type CategoriesPageResult = {
  items: CategoryListItemDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type CategoryParentOptionDto = {
  id: string;
  name: string;
  slug: string;
};

export type CategoryDetailDto = CategoryListItemDto;

/** Public storefront category node for nav menus. */
export type StoreNavCategoryDto = {
  id: string;
  name: string;
  slug: string;
  href: string;
  imageUrl: string | null;
  children: StoreNavCategoryDto[];
};
