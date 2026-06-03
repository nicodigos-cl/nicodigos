import "server-only";

import { getRedisCacheSdk } from "@/lib/redis/sdk";

export async function getCachedJson<T>(key: string): Promise<T | null> {
  try {
    const sdk = getRedisCacheSdk();
    if (!sdk) {
      return null;
    }
    return await sdk.getJson<T>(key);
  } catch {
    return null;
  }
}

export async function setCachedJson(
  key: string,
  value: unknown,
  ttlSeconds: number,
): Promise<void> {
  try {
    const sdk = getRedisCacheSdk();
    if (!sdk) {
      return;
    }
    await sdk.setJson(key, value, ttlSeconds);
  } catch {
    // Cache write failures should not break the main flow.
  }
}
