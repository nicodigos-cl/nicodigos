import "server-only";

import { createHash } from "node:crypto";

import { evaluateChileCompatibility } from "@/lib/kinguin/chile-compatibility";
import { kinguinSearchHasCriteria } from "@/lib/kinguin/admin-url";
import { getKinguinClient } from "@/lib/kinguin-client";
import { createLogger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { getReadyRedis } from "@/lib/redis";
import type { KinguinSearchQuery } from "@/lib/validations/kinguin";
import type {
  KinguinProduct,
  KinguinProductListResponse,
} from "@/types/kinguin";
import type {
  KinguinSearchHitDto,
  KinguinSearchPageResult,
} from "@/types/kinguin-admin";

const log = createLogger({ module: "kinguin-search" });

/** Short TTL — stock/prices move; enough to soften admin search spam. */
export const KINGUIN_SEARCH_TTL_SECONDS = 5 * 60;
export const KINGUIN_SEARCH_CACHE_PREFIX = "kinguin:search:";

/** Larger pages when scanning API results for local Chile/imported filters. */
const LOCAL_FILTER_SCAN_PAGE_SIZE: KinguinSearchQuery["pageSize"] = 50;
/** Hard cap so a broad catalog filter cannot fan out forever. */
const LOCAL_FILTER_MAX_API_PAGES = 100;
const LOCAL_FILTER_FETCH_CONCURRENCY = 5;

type CachedSearchPayload = {
  results: KinguinProduct[];
  item_count: number;
};

function mapSearchHit(
  product: KinguinProduct,
  imported: Map<number, string>,
): KinguinSearchHitDto {
  const localProductId = imported.get(product.kinguinId) ?? null;
  const chile = evaluateChileCompatibility({
    name: product.name,
    regionalLimitations: product.regionalLimitations,
    countryLimitation: product.countryLimitation,
  });
  return {
    kinguinId: product.kinguinId,
    productId: product.productId,
    name: product.name,
    platform: product.platform ?? null,
    priceEur:
      typeof product.price === "number" && Number.isFinite(product.price)
        ? product.price
        : null,
    offersCount: product.offersCount ?? product.offers?.length ?? 0,
    qty: product.qty ?? product.totalQty ?? 0,
    coverUrl: product.images?.cover?.url ?? null,
    coverThumbnailUrl:
      product.images?.cover?.thumbnail ?? product.images?.cover?.url ?? null,
    alreadyImported: localProductId != null,
    localProductId,
    chileCompatible: chile.compatible,
    chileWarning: chile.warning,
    regionalLimitations: product.regionalLimitations ?? null,
    countryLimitation: product.countryLimitation ?? [],
  };
}

function searchCacheKey(input: KinguinSearchQuery): string {
  const digest = createHash("sha256")
    .update(
      [
        input.q ?? "",
        input.page,
        input.pageSize,
        input.platform ?? "",
        input.regionId ?? "",
        input.tag ?? "",
      ].join("\0"),
    )
    .digest("hex")
    .slice(0, 32);
  return `${KINGUIN_SEARCH_CACHE_PREFIX}${digest}`;
}

function hasLocalFilters(input: KinguinSearchQuery): boolean {
  return input.chile !== "all" || input.imported !== "all";
}

async function readCachedSearch(
  key: string,
): Promise<CachedSearchPayload | null> {
  const redis = await getReadyRedis();
  if (!redis) return null;

  try {
    const raw = await redis.get(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedSearchPayload;
    if (
      !Array.isArray(parsed.results) ||
      typeof parsed.item_count !== "number"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function writeCachedSearch(
  key: string,
  payload: CachedSearchPayload,
): Promise<void> {
  const redis = await getReadyRedis();
  if (!redis) return;

  try {
    await redis.set(
      key,
      JSON.stringify(payload),
      "EX",
      KINGUIN_SEARCH_TTL_SECONDS,
    );
  } catch (error) {
    log.warn({ err: error }, "kinguin.search.cache_write_failed");
  }
}

/** Drop cached ESA search pages so the next admin search re-fetches from Kinguin. */
export async function invalidateKinguinSearchCache(): Promise<void> {
  const redis = await getReadyRedis();
  if (!redis) return;

  try {
    let cursor = "0";
    do {
      const [nextCursor, keys] = await redis.scan(
        cursor,
        "MATCH",
        `${KINGUIN_SEARCH_CACHE_PREFIX}*`,
        "COUNT",
        100,
      );
      cursor = nextCursor;
      if (keys.length > 0) {
        await redis.unlink(...keys);
      }
    } while (cursor !== "0");
  } catch (error) {
    log.warn({ err: error }, "kinguin.search.cache_invalidate_failed");
  }
}

async function fetchSearchFromApi(
  input: KinguinSearchQuery,
): Promise<CachedSearchPayload> {
  const client = getKinguinClient();
  const q = input.q?.trim() ?? "";
  const response: KinguinProductListResponse = await client.searchProducts({
    name: q || undefined,
    page: input.page,
    limit: input.pageSize,
    platform: input.platform,
    regionId: input.regionId,
    tags: input.tag,
  });

  return {
    results: response.results ?? [],
    item_count: response.item_count ?? response.results?.length ?? 0,
  };
}

async function getCachedOrFetchApiPage(
  input: KinguinSearchQuery,
  page: number,
  pageSize: KinguinSearchQuery["pageSize"],
): Promise<CachedSearchPayload> {
  const pageInput: KinguinSearchQuery = { ...input, page, pageSize };
  const cacheKey = searchCacheKey(pageInput);
  const cached = await readCachedSearch(cacheKey);
  if (cached) {
    return cached;
  }

  const payload = await fetchSearchFromApi(pageInput);
  await writeCachedSearch(cacheKey, payload);
  return payload;
}

function applyLocalFilters(
  items: KinguinSearchHitDto[],
  input: KinguinSearchQuery,
): KinguinSearchHitDto[] {
  return items.filter((item) => {
    if (input.chile === "compatible" && !item.chileCompatible) return false;
    if (input.chile === "incompatible" && item.chileCompatible) return false;
    if (input.imported === "imported" && !item.alreadyImported) return false;
    if (input.imported === "not_imported" && item.alreadyImported) return false;
    return true;
  });
}

async function loadImportedMap(
  kinguinIds?: number[],
): Promise<Map<number, string>> {
  const existing =
    kinguinIds != null
      ? kinguinIds.length > 0
        ? await prisma.product.findMany({
            where: { kinguinId: { in: kinguinIds } },
            select: { id: true, kinguinId: true },
          })
        : []
      : await prisma.product.findMany({
          where: { kinguinId: { not: null } },
          select: { id: true, kinguinId: true },
        });

  return new Map(
    existing
      .filter((row) => row.kinguinId != null)
      .map((row) => [row.kinguinId as number, row.id]),
  );
}

/** Pull enough ESA pages to apply Chile/imported filters across the full hit set. */
async function fetchApiResultsForLocalFilters(
  input: KinguinSearchQuery,
): Promise<KinguinProduct[]> {
  const first = await getCachedOrFetchApiPage(
    input,
    1,
    LOCAL_FILTER_SCAN_PAGE_SIZE,
  );
  const apiTotalPages = Math.min(
    LOCAL_FILTER_MAX_API_PAGES,
    Math.max(1, Math.ceil(first.item_count / LOCAL_FILTER_SCAN_PAGE_SIZE)),
  );

  const results = [...first.results];
  if (apiTotalPages <= 1) return results;

  for (
    let start = 2;
    start <= apiTotalPages;
    start += LOCAL_FILTER_FETCH_CONCURRENCY
  ) {
    const batchPages = Array.from(
      {
        length: Math.min(
          LOCAL_FILTER_FETCH_CONCURRENCY,
          apiTotalPages - start + 1,
        ),
      },
      (_, index) => start + index,
    );
    const pages = await Promise.all(
      batchPages.map((page) =>
        getCachedOrFetchApiPage(input, page, LOCAL_FILTER_SCAN_PAGE_SIZE),
      ),
    );
    for (const page of pages) {
      results.push(...page.results);
    }
  }

  return results;
}

function emptyResult(
  input: KinguinSearchQuery,
  q: string,
): KinguinSearchPageResult {
  return {
    items: [],
    total: 0,
    page: input.page,
    pageSize: input.pageSize,
    totalPages: 1,
    q,
  };
}

/** Live search against Kinguin ESA, cached briefly in Redis by query+filters+page. */
export async function searchKinguinProducts(
  input: KinguinSearchQuery,
): Promise<KinguinSearchPageResult> {
  const q = input.q?.trim() ?? "";
  if (!kinguinSearchHasCriteria(input)) {
    return emptyResult(input, "");
  }

  if (!hasLocalFilters(input)) {
    const payload = await getCachedOrFetchApiPage(
      input,
      input.page,
      input.pageSize,
    );
    const imported = await loadImportedMap(
      payload.results.map((item) => item.kinguinId),
    );
    const items = payload.results.map((item) => mapSearchHit(item, imported));
    const total = payload.item_count;

    return {
      items,
      total,
      page: input.page,
      pageSize: input.pageSize,
      totalPages: Math.max(1, Math.ceil(total / input.pageSize)),
      q,
    };
  }

  const [apiResults, imported] = await Promise.all([
    fetchApiResultsForLocalFilters(input),
    loadImportedMap(),
  ]);

  const filtered = applyLocalFilters(
    apiResults.map((item) => mapSearchHit(item, imported)),
    input,
  );
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / input.pageSize));
  const page = Math.min(Math.max(1, input.page), totalPages);
  const start = (page - 1) * input.pageSize;
  const items = filtered.slice(start, start + input.pageSize);

  return {
    items,
    total,
    page,
    pageSize: input.pageSize,
    totalPages,
    q,
  };
}
