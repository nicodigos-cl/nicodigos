import "server-only";

import { getCachedJson, setCachedJson } from "@/lib/redis/cache";
import { getKinguinSdk, isKinguinConfigured } from "@/lib/kinguin/client";

const REGIONS_CACHE_KEY = "kinguin:regions:v1";
const REGIONS_CACHE_TTL_SECONDS = 24 * 60 * 60;

type RegionsCache = Record<string, string>;

export async function getKinguinRegionsMap(): Promise<Map<number, string>> {
  const cached = await getCachedJson<RegionsCache>(REGIONS_CACHE_KEY);
  if (cached) {
    return new Map(
      Object.entries(cached).map(([id, name]) => [Number(id), name]),
    );
  }

  if (!isKinguinConfigured()) {
    return new Map();
  }

  const regions = await getKinguinSdk().getRegions();
  const record: RegionsCache = {};
  for (const region of regions) {
    record[String(region.id)] = region.name;
  }

  await setCachedJson(REGIONS_CACHE_KEY, record, REGIONS_CACHE_TTL_SECONDS);

  return new Map(regions.map((region) => [region.id, region.name]));
}

export async function resolveKinguinRegionName(
  regionId: number | null | undefined,
  regionalLimitations?: string | null,
): Promise<string | null> {
  if (regionId == null) {
    return regionalLimitations?.trim() || null;
  }

  const map = await getKinguinRegionsMap();
  return map.get(regionId) ?? regionalLimitations?.trim() ?? null;
}
