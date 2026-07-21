export type KinguinSearchHitDto = {
  kinguinId: number;
  productId: string;
  name: string;
  platform: string | null;
  priceEur: number | null;
  offersCount: number;
  qty: number;
  coverUrl: string | null;
  coverThumbnailUrl: string | null;
  alreadyImported: boolean;
  localProductId: string | null;
  /** False when activation looks unsafe for Chile. */
  chileCompatible: boolean;
  /** Spanish warning when not Chile-compatible. */
  chileWarning: string | null;
  regionalLimitations: string | null;
  countryLimitation: string[];
};

export type KinguinSearchPageResult = {
  items: KinguinSearchHitDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  q: string;
};

export type KinguinOfferPreviewDto = {
  offerId: string;
  name: string | null;
  priceEur: number;
  qty: number;
  availableQty: number | null;
  merchantName: string | null;
  isCheapest: boolean;
};

export type KinguinProductPreviewDto = {
  kinguinId: number;
  productId: string;
  name: string;
  platform: string | null;
  description: string | null;
  coverUrl: string | null;
  offers: KinguinOfferPreviewDto[];
  cheapestOfferId: string | null;
  priceEur: number | null;
  alreadyImported: boolean;
  localProductId: string | null;
  chileCompatible: boolean;
  chileWarning: string | null;
  regionalLimitations: string | null;
  countryLimitation: string[];
  activationDetails: string | null;
};
