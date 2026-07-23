/** Absolute max items in client selection / export bulk (memory-safe). */
export const BULK_EXPORT_SELECTION_LIMIT = 1000;

/** Default UI limit for "select all" (user can raise up to EXPORT). */
export const DEFAULT_BULK_SELECTION_LIMIT = 100;

/** Presets shown in the selection-limit control. */
export const BULK_SELECTION_LIMIT_OPTIONS = [
  25, 50, 100, 250, 500, 1000,
] as const;

/** Convert / import / status mutations (heavier server work). */
export const SMM_SERVICE_PROCESS_LIMIT = 25;
export const KINGUIN_PROCESS_LIMIT = 25;
export const PRODUCT_PROCESS_LIMIT = 50;

/**
 * Concurrent OpenAI translate calls (one product / chunk per request).
 * Keep below org RPM; SDK retries 429s. Prefer higher concurrency over huge
 * multi-product payloads so long descriptions stay in separate requests.
 */
export const AI_TRANSLATE_CONCURRENCY = 8;
/** Titles per OpenAI translate request (SMM short-title batches only). */
export const AI_TRANSLATE_CHUNK_SIZE = 5;
/** Concurrent Kinguin/SMM import mutations (API + DB + R2). */
export const IMPORT_CONCURRENCY = 5;
/** Concurrent Kinguin remote product fetches. */
export const KINGUIN_FETCH_CONCURRENCY = 8;

/**
 * @deprecated Prefer PROCESS / EXPORT limits.
 * Kept as aliases so older call sites still compile during migration.
 */
export const SMM_SERVICE_SELECTION_LIMIT = SMM_SERVICE_PROCESS_LIMIT;
export const KINGUIN_SELECTION_LIMIT = KINGUIN_PROCESS_LIMIT;
export const PRODUCT_SELECTION_LIMIT = PRODUCT_PROCESS_LIMIT;

export const DEFAULT_MARKUP_MIN_PCT = 50;
export const DEFAULT_MARKUP_MAX_PCT = 100;

export const FX_USD_CLP_CACHE_KEY = "fx:usd-clp";
export const FX_EUR_CLP_CACHE_KEY = "fx:eur-clp";
export const FX_USD_CLP_TTL_SECONDS = 3600;
export const FX_EUR_CLP_TTL_SECONDS = 3600;

/** Default markup for Kinguin imports (same band as SMM min). */
export const DEFAULT_KINGUIN_MARKUP_PCT = DEFAULT_MARKUP_MIN_PCT;

export function clampBulkSelectionLimit(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_BULK_SELECTION_LIMIT;
  return Math.min(
    BULK_EXPORT_SELECTION_LIMIT,
    Math.max(1, Math.floor(value)),
  );
}
