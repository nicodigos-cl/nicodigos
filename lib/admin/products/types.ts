export type AdminProductListItem = {
  id: string;
  name: string;
  slug: string;
  platform: string;
  qty: number;
  sellPrice: string;
  costPrice: string;
  sourceCostPrice: string | null;
  sourceCurrency: string;
  isActive: boolean;
  isPreorder: boolean;
  kinguinId: number;
  coverImageUrl: string | null;
  offerCount: number;
  updatedAt: string;
};

export type KinguinSearchResultItem = {
  kinguinId: number;
  productId: string;
  name: string;
  platform: string;
  price: number;
  qty: number;
  coverImageUrl: string | null;
  isPreorder: boolean;
  alreadyImported: boolean;
};

export type KinguinSearchMode = "api" | "catalog";

export type KinguinSearchPayload = {
  items: KinguinSearchResultItem[];
  total: number;
  fromCache: boolean;
  searchMode: KinguinSearchMode;
};

export type AdminProductActionResult<T = void> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string };
