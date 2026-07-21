/** Max selectable SMM services for bulk actions (export / convert). */
export const SMM_SERVICE_SELECTION_LIMIT = 25;

/** Max selectable Kinguin hits for bulk import. */
export const KINGUIN_SELECTION_LIMIT = 25;

export const DEFAULT_MARKUP_MIN_PCT = 50;
export const DEFAULT_MARKUP_MAX_PCT = 100;

export const FX_USD_CLP_CACHE_KEY = "fx:usd-clp";
export const FX_EUR_CLP_CACHE_KEY = "fx:eur-clp";
export const FX_USD_CLP_TTL_SECONDS = 3600;
export const FX_EUR_CLP_TTL_SECONDS = 3600;

/** Default markup for Kinguin imports (same band as SMM min). */
export const DEFAULT_KINGUIN_MARKUP_PCT = DEFAULT_MARKUP_MIN_PCT;
