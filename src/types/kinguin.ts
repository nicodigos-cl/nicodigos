/** Kinguin ESA error body — see Kinguin-eCommerce-API/api/ErrorsCodes.md */
export type KinguinErrorBody = {
  kind?: string;
  status?: number;
  title?: string;
  detail?: string;
  path?: string;
  method?: string;
  trace?: string;
  timestamp?: string;
  propertyPath?: string;
  invalidValue?: unknown;
};

export type KinguinEnvironment = "production" | "sandbox";

export type KinguinWholesaleTier = {
  level: number;
  price: number;
};

export type KinguinWholesale = {
  enabled: boolean;
  tiers?: KinguinWholesaleTier[];
};

export type KinguinOffer = {
  name?: string;
  offerId: string;
  price: number;
  qty?: number;
  availableQty?: number;
  textQty?: number;
  availableTextQty?: number;
  isPreorder?: boolean;
  releaseDate?: string;
  merchantName?: string;
  wholesale?: KinguinWholesale;
};

export type KinguinProductImages = {
  screenshots?: Array<{ url?: string; thumbnail?: string }>;
  cover?: { url?: string; thumbnail?: string };
};

export type KinguinProduct = {
  kinguinId: number;
  productId: string;
  name: string;
  originalName?: string | null;
  description?: string;
  developers?: string[];
  publishers?: string[];
  genres?: string[];
  platform?: string;
  releaseDate?: string;
  qty?: number;
  textQty?: number;
  totalQty?: number;
  price?: number;
  offers?: KinguinOffer[];
  offersCount?: number;
  cheapestOfferId?: string[];
  isPreorder?: boolean;
  metacriticScore?: number | null;
  regionalLimitations?: string;
  countryLimitation?: string[];
  regionId?: number;
  activationDetails?: string;
  videos?: Array<{ video_id?: string }>;
  languages?: string[];
  systemRequirements?: Array<{ system?: string; requirement?: string[] }>;
  tags?: string[];
  merchantName?: string;
  ageRating?: string;
  images?: KinguinProductImages;
  updatedAt?: string;
};

export type KinguinProductListResponse = {
  results: KinguinProduct[];
  item_count: number;
};

export type KinguinProductSearchParams = {
  page?: number;
  limit?: number;
  name?: string;
  /** Docs typo: `kingiunId` is also accepted by the API. Prefer `kinguinId`. */
  sortBy?: "kinguinId" | "kingiunId" | "updatedAt";
  sortType?: "asc" | "desc";
  platform?: string;
  genre?: string;
  tags?: string;
  kinguinId?: string;
  productId?: string;
  languages?: string;
  isPreorder?: "yes" | "no";
  activePreorder?: "yes";
  regionId?: number;
  updatedSince?: string;
  updatedTo?: string;
  withText?: "yes";
  merchantName?: string;
};

export type KinguinKeyType = "text";

export type KinguinPlaceOrderProductV1 = {
  kinguinId: number;
  qty: number;
  price: number;
  keyType?: KinguinKeyType;
  offerId?: string;
};

export type KinguinPlaceOrderProductV2 = {
  productId: string;
  qty: number;
  price: number;
  keyType?: KinguinKeyType;
  offerId?: string;
};

export type KinguinPlaceOrderRequestV1 = {
  products: KinguinPlaceOrderProductV1[];
  orderExternalId?: string;
};

export type KinguinPlaceOrderRequestV2 = {
  products: KinguinPlaceOrderProductV2[];
  orderExternalId?: string;
};

export type KinguinOrderStatus =
  | "processing"
  | "completed"
  | "canceled"
  | "refunded";

export type KinguinKeyStatus =
  | "PENDING"
  | "PROCESSING"
  | "DELIVERED"
  | "RETURNED"
  | "REFUNDED"
  | "CANCELED";

export type KinguinOrderKeyRef = {
  id: string;
  status: KinguinKeyStatus | string;
};

export type KinguinOrderProduct = {
  kinguinId?: number;
  productId?: string;
  offerId?: string;
  qty?: number;
  name?: string;
  price?: number;
  totalPrice?: number;
  requestPrice?: number;
  isPreorder?: boolean;
  releaseDate?: string;
  keyType?: string;
  keys?: KinguinOrderKeyRef[];
};

export type KinguinOrder = {
  orderId: string;
  kinguinOrderId?: string;
  orderExternalId?: string | null;
  status: KinguinOrderStatus | string;
  totalPrice?: number;
  requestTotalPrice?: number;
  paymentPrice?: number;
  userEmail?: string;
  storeId?: string;
  createdAt?: string;
  isPreorder?: boolean;
  totalQty?: number;
  preorderReleaseDate?: string | null;
  products?: KinguinOrderProduct[];
};

export type KinguinOrderListResponse = {
  results: KinguinOrder[];
  item_count: number;
};

export type KinguinOrderSearchParams = {
  page?: number;
  limit?: number;
  createdAtFrom?: string;
  createdAtTo?: string;
  kinguinId?: string;
  productId?: string;
  orderId?: string;
  orderExternalId?: string;
  status?: KinguinOrderStatus | string;
  isPreorder?: "yes" | "no";
};

export type KinguinDownloadedKey = {
  id: string;
  serial: string;
  type: string;
  name?: string;
  kinguinId?: number;
  offerId?: string;
  productId?: string;
};

export type KinguinReturnedKey = {
  id: string;
  status: string;
};

export type KinguinBalance = {
  balance: number;
};

export type KinguinRegion = {
  id: number;
  name: string;
};

export type KinguinWebhookProductUpdate = {
  kinguinId: number;
  productId: string;
  qty?: number;
  textQty?: number;
  cheapestOfferId?: string[];
  updatedAt?: string;
};

export type KinguinWebhookOrderStatus = {
  orderId: string;
  orderExternalId?: string | null;
  status: KinguinOrderStatus | string;
  updatedAt?: string;
};
