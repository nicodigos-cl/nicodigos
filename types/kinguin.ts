/** GET /v1/products query parameters */
export type KinguinProductSearchParams = {
  page?: number;
  limit?: number;
  name?: string;
  sortBy?: "kingiunId" | "updatedAt";
  sortType?: "asc" | "desc";
  platform?: string;
  genre?: string;
  kinguinId?: string;
  productId?: string;
  languages?: string;
  isPreorder?: "yes" | "no";
  activePreorder?: "yes";
  regionId?: number;
  tags?: string;
  updatedSince?: string;
  updatedTo?: string;
  withText?: "yes";
  merchantName?: string;
};

/** GET /v1/products response */
export type KinguinProductSearchResponse = {
  results: KinguinProduct[];
  item_count: number;
};

/** GET /v2/products/{productId} — Product Object */
export type KinguinProduct = {
  kinguinId: number;
  productId: string;
  cheapestOfferId: string[];
  name: string;
  originalName?: string;
  description?: string;
  developers?: string[];
  publishers?: string[];
  genres: string[];
  platform: string;
  releaseDate?: string;
  qty: number;
  price: number;
  textQty: number;
  offers: KinguinOffer[];
  offersCount: number;
  totalQty: number;
  isPreorder: boolean;
  metacriticScore: number;
  regionalLimitations: string;
  countryLimitation: string[];
  regionId: number;
  activationDetails: string;
  videos?: KinguinVideo[];
  languages: string[];
  updatedAt: string;
  systemRequirements: KinguinSystemRequirement[];
  tags: KinguinProductTag[];
  merchantName: string[];
  ageRating?: string;
  steam?: string;
  images: KinguinImages;
};

export type KinguinProductTag =
  | "indie valley"
  | "dlc"
  | "base"
  | "software"
  | "prepaid";

export type KinguinOffer = {
  name: string;
  offerId: string;
  price: number;
  qty: number;
  availableQty?: number;
  availableTextQty?: number;
  textQty: number;
  merchantName?: string;
  isPreorder: boolean;
  releaseDate: string;
  wholesale?: KinguinOfferWholesale;
};

export type KinguinOfferWholesale = {
  enabled: boolean;
  tiers: KinguinOfferWholesaleTier[];
};

export type KinguinOfferWholesaleTier = {
  level: 1 | 2 | 3 | 4;
  price: number;
};

export type KinguinVideo = {
  video_id: string;
  video_url?: string;
};

export type KinguinSystemRequirement = {
  system: string;
  requirement: string[];
};

export type KinguinImages = {
  screenshots: KinguinScreenshot[];
  cover: KinguinCover;
};

export type KinguinScreenshot = {
  url: string;
  thumbnail: string;
};

export type KinguinCover = {
  url: string;
  thumbnail: string;
};

/** POST /v2/order */
export type KinguinPlaceOrderInput = {
  products: KinguinPlaceOrderProductInput[];
  orderExternalId?: string;
};

export type KinguinPlaceOrderProductInput = {
  productId: string;
  qty: number;
  price: number;
  keyType?: "text";
  offerId?: string;
};

/** Order Object (returned by POST /v2/order, GET /v1/order/{orderId}) */
export type KinguinOrder = {
  totalPrice: number;
  requestTotalPrice: number;
  paymentPrice: number;
  status: KinguinOrderStatus;
  userEmail: string;
  storeId: number;
  createdAt: string;
  orderId: string;
  kinguinOrderId?: number;
  orderExternalId?: string;
  isPreorder: boolean;
  totalQty: number;
  preorderReleaseDate?: string;
  products: KinguinOrderProduct[];
};

export type KinguinOrderStatus =
  | "processing"
  | "completed"
  | "canceled"
  | "refunded";

export type KinguinOrderProduct = {
  kinguinId: number;
  offerId: string;
  productId: string;
  qty: number;
  name: string;
  price: number;
  totalPrice: number;
  requestPrice: number;
  isPreorder: boolean;
  releaseDate: string;
  keyType?: "text";
  keys?: KinguinOrderKeySummary[];
};

export type KinguinOrderKeySummary = {
  id: string;
  status: KinguinKeyStatus;
};

/** GET /v2/order/{orderId}/keys — Key Object */
export type KinguinKey = {
  id: string;
  serial: string;
  type: KinguinKeyContentType;
  name: string;
  kinguinId: number;
  offerId: string;
  productId: string;
};

export type KinguinKeyContentType =
  | "text/plain"
  | "image/jpeg"
  | "image/png"
  | "image/gif";

export type KinguinKeyStatus =
  | "PENDING"
  | "PROCESSING"
  | "DELIVERED"
  | "RETURNED"
  | "REFUNDED"
  | "CANCELED";

/** POST /v2/order/{orderId}/keys/return */
export type KinguinReturnKeyResult = {
  id: string;
  status: KinguinKeyStatus;
};

/** GET /v1/order query parameters */
export type KinguinOrderSearchParams = {
  page?: number;
  limit?: number;
  createdAtFrom?: string;
  createdAtTo?: string;
  kinguinId?: number;
  productId?: string;
  orderId?: string;
  orderExternalId?: string;
  status?: KinguinOrderStatus;
  isPreorder?: "yes" | "no";
};

/** GET /v1/order response */
export type KinguinOrderSearchResponse = {
  results: KinguinOrder[];
  item_count: number;
};

/** GET /v2/order/{orderId}/keys query parameters */
export type KinguinDownloadKeysParams = {
  page?: number;
  limit?: number;
};

/** GET /v1/balance */
export type KinguinBalance = {
  balance: number;
};

/** GET /v1/regions */
export type KinguinRegion = {
  id: number;
  name: string;
};

/** API error response */
export type KinguinErrorResponse = {
  kind: KinguinErrorKind;
  status: number;
  title?: string;
  detail: string;
  path?: string;
  method?: string;
  trace?: string;
  timestamp?: string;
  propertyPath?: string;
  invalidValue?: unknown;
  type?: string;
};

export type KinguinErrorKind =
  | "ConstraintViolation"
  | "Error"
  | "HttpClient"
  | "Http"
  | "Authorization"
  | "InsufficientBalance"
  | "OrderFailed"
  | "Preorder"
  | "ProductUnavailable"
  | "OrderNotFound"
  | "ResourceLock"
  | "OrderNotSupported"
  | "NoKeysToReturn";

/** Webhook: X-Event-Name: product.update */
export type KinguinProductUpdateWebhook = {
  kinguinId: number;
  productId: string;
  qty: number;
  textQty: number;
  cheapestOfferId: string[];
  updatedAt: string;
};

/** Webhook: X-Event-Name: order.status */
export type KinguinOrderStatusWebhook = {
  orderId: string;
  orderExternalId?: string;
  status: KinguinOrderStatus;
  updatedAt: string;
};
