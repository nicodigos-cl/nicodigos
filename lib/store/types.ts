export type StoreProductPreview = {
  id: string;
  slug: string;
  name: string;
  platform: string;
  coverImageUrl: string | null;
  sellPrice: string;
  qty: number;
  isActive: boolean;
};

export type CartLineView = {
  id: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
  product: StoreProductPreview;
  offer: {
    id: string;
    name: string;
    qty: number;
  };
};

export type CartView = {
  id: string;
  items: CartLineView[];
  itemCount: number;
  subtotal: string;
};

export type WishlistItemView = {
  id: string;
  addedAt: string;
  product: StoreProductPreview;
};

export type WishlistView = {
  id: string;
  items: WishlistItemView[];
  itemCount: number;
};

export type StoreCounts = {
  cart: number;
  wishlist: number;
};

export type StoreActionResult<T = void> =
  | { success: true; data?: T; message?: string }
  | { success: false; error: string };
