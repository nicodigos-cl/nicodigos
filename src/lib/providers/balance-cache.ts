import "server-only";

import { getRedis } from "@/lib/redis";
import { createLogger } from "@/lib/logger";
import {
  providerBalanceRedisKey,
  type ProviderBalanceKind,
  type ProviderBalanceSnapshot,
} from "@/lib/providers/balance-types";

const log = createLogger({ module: "provider-balance-cache" });

export async function readProviderBalanceCache(
  provider: ProviderBalanceKind,
  accountId: string,
): Promise<ProviderBalanceSnapshot | null> {
  const redis = getRedis();
  if (!redis) return null;

  try {
    if (redis.status !== "ready") {
      await redis.connect().catch(() => undefined);
    }
    const raw = await redis.get(providerBalanceRedisKey(provider, accountId));
    if (!raw) return null;
    return JSON.parse(raw) as ProviderBalanceSnapshot;
  } catch (error) {
    log.warn({ err: error, provider, accountId }, "provider.balance.cache_read_failed");
    return null;
  }
}

export async function writeProviderBalanceCache(
  snapshot: ProviderBalanceSnapshot,
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    if (redis.status !== "ready") {
      await redis.connect().catch(() => undefined);
    }
    const key = providerBalanceRedisKey(snapshot.provider, snapshot.accountId);
    const payload = JSON.stringify(snapshot);
    await redis.set(key, payload, "EX", Math.max(30, snapshot.ttlSeconds));
  } catch (error) {
    log.warn(
      { err: error, provider: snapshot.provider, accountId: snapshot.accountId },
      "provider.balance.cache_write_failed",
    );
  }
}
