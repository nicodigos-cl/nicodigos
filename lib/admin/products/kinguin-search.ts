import { getCachedJson, setCachedJson } from "@/lib/redis/cache";
import {
  formatKinguinError,
  isKinguinSandbox,
  isRetryableKinguinNameSearchError,
} from "@/lib/kinguin/errors";
import { getKinguinSdk } from "@/lib/kinguin/client";
import type { KinguinSdk } from "@/lib/kinguin/sdk";
import type {
  KinguinProduct,
  KinguinProductSearchParams,
} from "@/types/kinguin";

/** Kinguin max per page (api/products/v1 README). */
const PAGE_SIZE = 100;
const MAX_PAGES = 200;
const SEARCH_CACHE_TTL_SECONDS = 15 * 60;
const CATALOG_CACHE_TTL_SECONDS = 60 * 60;
const SEARCH_CACHE_KEY_PREFIX = "kinguin:search:v2:";
const CATALOG_CACHE_KEY = "kinguin:catalog:v2";

export type KinguinSearchMode = "api" | "catalog";

function normalizeSearchQuery(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function searchCacheKey(name: string): string {
  return `${SEARCH_CACHE_KEY_PREFIX}${normalizeSearchQuery(name)}`;
}

/** Kinguin pagination can return the same productId more than once. */
function dedupeKinguinProducts(products: KinguinProduct[]): KinguinProduct[] {
  const seen = new Set<string>();

  return products.filter((product) => {
    const key = product.productId || String(product.kinguinId);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function matchesProductQuery(product: KinguinProduct, query: string): boolean {
  const haystack =
    `${product.name} ${product.originalName ?? ""}`.toLowerCase();
  const terms = normalizeSearchQuery(query).split(" ").filter(Boolean);

  return terms.every((term) => haystack.includes(term));
}

async function fetchAllPages(
  kinguin: KinguinSdk,
  params: Omit<KinguinProductSearchParams, "page" | "limit"> = {},
): Promise<KinguinProduct[]> {
  const all: KinguinProduct[] = [];
  let totalCount = 0;
  let page = 1;

  while (page <= MAX_PAGES) {
    const response = await kinguin.searchProducts({
      ...params,
      limit: PAGE_SIZE,
      page,
    });

    const batch = response.results ?? [];

    if (page === 1) {
      totalCount = response.item_count;
    }

    all.push(...batch);

    if (batch.length === 0) {
      break;
    }

    if (totalCount > 0 && all.length >= totalCount) {
      break;
    }

    if (batch.length < PAGE_SIZE) {
      break;
    }

    page += 1;
  }

  return dedupeKinguinProducts(all);
}

async function fetchFullCatalog(
  kinguin: KinguinSdk,
): Promise<KinguinProduct[]> {
  const cached = await getCachedJson<KinguinProduct[]>(CATALOG_CACHE_KEY);
  if (cached) {
    return cached;
  }

  const catalog = await fetchAllPages(kinguin);
  await setCachedJson(CATALOG_CACHE_KEY, catalog, CATALOG_CACHE_TTL_SECONDS);

  return catalog;
}

/**
 * Kinguin sandbox returns HTTP 500 for any valid `name` query (verified with curl/fetch/axios).
 * Production supports `name`; we fall back to catalog filter if the API errors.
 */
async function searchByNameViaApi(
  kinguin: KinguinSdk,
  name: string,
): Promise<KinguinProduct[] | null> {
  if (isKinguinSandbox()) {
    return null;
  }

  const trimmed = name.trim();

  try {
    return await fetchAllPages(kinguin, { name: trimmed });
  } catch (error) {
    if (isRetryableKinguinNameSearchError(error)) {
      return null;
    }
    throw error;
  }
}

async function searchByCatalogFilter(
  kinguin: KinguinSdk,
  name: string,
): Promise<KinguinProduct[]> {
  const catalog = await fetchFullCatalog(kinguin);
  return catalog.filter((product) => matchesProductQuery(product, name));
}

export async function fetchAllKinguinProductsByName(
  name: string,
  kinguin: KinguinSdk = getKinguinSdk(),
): Promise<{
  products: KinguinProduct[];
  fromCache: boolean;
  searchMode: KinguinSearchMode;
}> {
  const cacheKey = searchCacheKey(name);
  const cached = await getCachedJson<{
    products: KinguinProduct[];
    searchMode: KinguinSearchMode;
  }>(cacheKey);

  if (cached) {
    return {
      products: dedupeKinguinProducts(cached.products),
      fromCache: true,
      searchMode: cached.searchMode,
    };
  }

  let searchMode: KinguinSearchMode = "api";
  let products = await searchByNameViaApi(kinguin, name);

  if (products === null) {
    searchMode = "catalog";
    products = await searchByCatalogFilter(kinguin, name);
  }

  products = dedupeKinguinProducts(products);

  await setCachedJson(
    cacheKey,
    { products, searchMode },
    SEARCH_CACHE_TTL_SECONDS,
  );

  return { products, fromCache: false, searchMode };
}

export { formatKinguinError };
