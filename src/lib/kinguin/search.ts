import "server-only";

import { createHash } from "node:crypto";

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

type CachedSearchPayload = {
  results: KinguinProduct[];
  item_count: number;
};

function mapSearchHit(
  product: KinguinProduct,
  imported: Map<number, string>,
): KinguinSearchHitDto {
  const localProductId = imported.get(product.kinguinId) ?? null;
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
  };
}

function searchCacheKey(q: string, page: number, pageSize: number): string {
  const digest = createHash("sha256")
    .update(`${q}\0${page}\0${pageSize}`)
    .digest("hex")
    .slice(0, 32);
  return `${KINGUIN_SEARCH_CACHE_PREFIX}${digest}`;
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
    if (!Array.isArray(parsed.results) || typeof parsed.item_count !== "number") {
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

async function fetchSearchFromApi(
  q: string,
  page: number,
  pageSize: number,
): Promise<CachedSearchPayload> {
  const client = getKinguinClient();
  const response: KinguinProductListResponse = await client.searchProducts({
    name: q,
    page,
    limit: pageSize,
  });

  return {
    results: response.results ?? [],
    item_count: response.item_count ?? response.results?.length ?? 0,
  };
}

/** Live search against Kinguin ESA, cached briefly in Redis by query+page. */
export async function searchKinguinProducts(
  input: KinguinSearchQuery,
): Promise<KinguinSearchPageResult> {
  const q = input.q?.trim() ?? "";
  if (!q) {
    return {
      items: [],
      total: 0,
      page: input.page,
      pageSize: input.pageSize,
      totalPages: 1,
      q: "",
    };
  }

  const cacheKey = searchCacheKey(q, input.page, input.pageSize);
  let payload = await readCachedSearch(cacheKey);
  let fromCache = payload != null;

  if (!payload) {
    payload = await fetchSearchFromApi(q, input.page, input.pageSize);
    fromCache = false;
    await writeCachedSearch(cacheKey, payload);
  }

  if (fromCache) {
    log.debug(
      { q, page: input.page, pageSize: input.pageSize },
      "kinguin.search.cache_hit",
    );
  }

  const kinguinIds = payload.results.map((item) => item.kinguinId);
  const existing =
    kinguinIds.length > 0
      ? await prisma.product.findMany({
          where: { kinguinId: { in: kinguinIds } },
          select: { id: true, kinguinId: true },
        })
      : [];

  const imported = new Map(
    existing
      .filter((row) => row.kinguinId != null)
      .map((row) => [row.kinguinId as number, row.id]),
  );

  const total = payload.item_count;

  return {
    items: payload.results.map((item) => mapSearchHit(item, imported)),
    total,
    page: input.page,
    pageSize: input.pageSize,
    totalPages: Math.max(1, Math.ceil(total / input.pageSize)),
    q,
  };
}
