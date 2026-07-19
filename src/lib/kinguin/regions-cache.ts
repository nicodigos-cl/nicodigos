import "server-only";

import { getRedis } from "@/lib/redis";
import { createLogger } from "@/lib/logger";
import { getKinguinClient } from "@/lib/kinguin-client";

const log = createLogger({ module: "kinguin-regions" });

export const KINGUIN_REGIONS_CACHE_KEY = "kinguin:regions";
export const KINGUIN_REGIONS_TTL_SECONDS = 24 * 60 * 60;

export async function getCachedKinguinRegionName(
  regionId: number | null | undefined,
): Promise<string | null> {
  if (regionId == null) return null;

  const redis = getRedis();
  let raw: string | null = null;

  if (redis) {
    try {
      if (redis.status !== "ready") {
        await redis.connect().catch(() => undefined);
      }
      raw = await redis.get(KINGUIN_REGIONS_CACHE_KEY);
    } catch {
      raw = null;
    }
  }

  if (!raw) {
    try {
      const regions = await getKinguinClient().getRegions();
      raw = JSON.stringify(
        Object.fromEntries(regions.map((region) => [region.id, region.name])),
      );
      if (redis && raw) {
        try {
          await redis.set(
            KINGUIN_REGIONS_CACHE_KEY,
            raw,
            "EX",
            KINGUIN_REGIONS_TTL_SECONDS,
          );
        } catch {
          // ignore
        }
      }
    } catch (error) {
      log.warn({ err: error }, "kinguin.regions.fetch_failed");
      return null;
    }
  }

  try {
    const map = JSON.parse(raw) as Record<string, string>;
    return map[String(regionId)] ?? null;
  } catch {
    return null;
  }
}
