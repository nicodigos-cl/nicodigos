import "server-only";

import { getKinguinClient } from "@/lib/kinguin-client";
import { createLogger } from "@/lib/logger";
import { getReadyRedis } from "@/lib/redis";
import type { KinguinRegion } from "@/types/kinguin";

const log = createLogger({ module: "kinguin-catalog-filters" });

export const KINGUIN_REGIONS_LIST_CACHE_KEY = "kinguin:regions:list";
export const KINGUIN_PLATFORMS_CACHE_KEY = "kinguin:platforms";
export const KINGUIN_CATALOG_FILTERS_TTL_SECONDS = 24 * 60 * 60;

/** Common platforms for the admin filter when the API list is unavailable. */
export const FALLBACK_KINGUIN_PLATFORMS = [
  "Steam",
  "PC Steam",
  "EA App",
  "PC Epic Games",
  "PC Ubisoft Connect",
  "PC Battle.net",
  "PC GOG",
  "Xbox Live",
  "PlayStation Network",
  "Nintendo",
  "Other",
] as const;

async function readCache(key: string): Promise<string | null> {
  const redis = await getReadyRedis();
  if (!redis) return null;
  try {
    return await redis.get(key);
  } catch {
    return null;
  }
}

async function writeCache(key: string, value: string): Promise<void> {
  const redis = await getReadyRedis();
  if (!redis) return;
  try {
    await redis.set(key, value, "EX", KINGUIN_CATALOG_FILTERS_TTL_SECONDS);
  } catch {
    // ignore
  }
}

export async function getCachedKinguinRegions(): Promise<KinguinRegion[]> {
  const raw = await readCache(KINGUIN_REGIONS_LIST_CACHE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as KinguinRegion[];
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // fall through
    }
  }

  try {
    const regions = await getKinguinClient().getRegions();
    await writeCache(KINGUIN_REGIONS_LIST_CACHE_KEY, JSON.stringify(regions));
    return regions;
  } catch (error) {
    log.warn({ err: error }, "kinguin.regions.list_fetch_failed");
    return [];
  }
}

export async function getCachedKinguinPlatforms(): Promise<string[]> {
  const raw = await readCache(KINGUIN_PLATFORMS_CACHE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as string[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return [...new Set(parsed)].sort((a, b) => a.localeCompare(b));
      }
    } catch {
      // fall through
    }
  }

  try {
    const platforms = await getKinguinClient().getPlatforms();
    const unique = [...new Set(platforms)].sort((a, b) => a.localeCompare(b));
    await writeCache(KINGUIN_PLATFORMS_CACHE_KEY, JSON.stringify(unique));
    return unique;
  } catch (error) {
    log.warn({ err: error }, "kinguin.platforms.fetch_failed");
    return [...FALLBACK_KINGUIN_PLATFORMS];
  }
}
