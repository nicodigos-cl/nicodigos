import "server-only";

import { getKinguinClient } from "@/lib/kinguin-client";
import { getRedis } from "@/lib/redis";
import { createLogger } from "@/lib/logger";

const log = createLogger({ module: "kinguin-balance" });

export const KINGUIN_BALANCE_CACHE_KEY = "kinguin:balance";
export const KINGUIN_BALANCE_TTL_SECONDS = 5 * 60;

export const KINGUIN_REGIONS_CACHE_KEY = "kinguin:regions";
export const KINGUIN_REGIONS_TTL_SECONDS = 24 * 60 * 60;

async function withRedisCache(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<string>,
): Promise<string | null> {
  const redis = getRedis();

  if (redis) {
    try {
      if (redis.status !== "ready") {
        await redis.connect().catch(() => undefined);
      }
      const cached = await redis.get(key);
      if (cached) return cached;
    } catch {
      // Fall through to network fetch.
    }
  }

  try {
    const value = await fetcher();
    if (redis) {
      try {
        await redis.set(key, value, "EX", ttlSeconds);
      } catch {
        // Ignore cache write failures.
      }
    }
    return value;
  } catch (error) {
    log.warn({ err: error }, "kinguin.cache_fetch_failed");
    return null;
  }
}

/** Cached ESA wallet balance in EUR. */
export async function getCachedKinguinBalance(): Promise<number | null> {
  const raw = await withRedisCache(
    KINGUIN_BALANCE_CACHE_KEY,
    KINGUIN_BALANCE_TTL_SECONDS,
    async () => {
      const balance = await getKinguinClient().getBalance();
      return String(balance.balance);
    },
  );

  if (raw == null) return null;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function getCachedKinguinRegionName(
  regionId: number | null | undefined,
): Promise<string | null> {
  if (regionId == null) return null;

  const raw = await withRedisCache(
    KINGUIN_REGIONS_CACHE_KEY,
    KINGUIN_REGIONS_TTL_SECONDS,
    async () => {
      const regions = await getKinguinClient().getRegions();
      return JSON.stringify(
        Object.fromEntries(regions.map((region) => [region.id, region.name])),
      );
    },
  );

  if (!raw) return null;

  try {
    const map = JSON.parse(raw) as Record<string, string>;
    return map[String(regionId)] ?? null;
  } catch {
    return null;
  }
}

/**
 * Whether our Kinguin wallet can cover the product cost right now.
 * If balance is unknown, assume we cannot auto-buy (safer ETA).
 */
export function canAffordKinguinPurchase(
  balanceEur: number | null,
  sourceCostEur: number | null,
): boolean {
  if (sourceCostEur == null || !Number.isFinite(sourceCostEur)) {
    return true;
  }
  if (balanceEur == null || !Number.isFinite(balanceEur)) {
    return false;
  }
  return balanceEur >= sourceCostEur;
}
