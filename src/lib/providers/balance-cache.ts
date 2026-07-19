import "server-only";

import { getReadyRedis } from "@/lib/redis";
import { createLogger } from "@/lib/logger";
import {
  providerBalanceRedisKey,
  type ProviderBalanceKind,
  type ProviderBalanceSnapshot,
} from "@/lib/providers/balance-types";

const log = createLogger({ module: "provider-balance-cache" });

function isOfflineQueueError(error: unknown): boolean {
  return (
    error instanceof Error &&
    /stream isn't writeable|enableofflinequeue|connection is closed/i.test(
      error.message,
    )
  );
}

export async function readProviderBalanceCache(
  provider: ProviderBalanceKind,
  accountId: string,
): Promise<ProviderBalanceSnapshot | null> {
  const redis = await getReadyRedis();
  if (!redis) return null;

  try {
    const raw = await redis.get(providerBalanceRedisKey(provider, accountId));
    if (!raw) return null;
    return JSON.parse(raw) as ProviderBalanceSnapshot;
  } catch (error) {
    if (isOfflineQueueError(error)) {
      log.debug(
        { provider, accountId },
        "provider.balance.cache_read_skipped_offline",
      );
      return null;
    }
    log.warn({ err: error, provider, accountId }, "provider.balance.cache_read_failed");
    return null;
  }
}

export async function writeProviderBalanceCache(
  snapshot: ProviderBalanceSnapshot,
): Promise<void> {
  const redis = await getReadyRedis();
  if (!redis) return;

  try {
    const key = providerBalanceRedisKey(snapshot.provider, snapshot.accountId);
    const payload = JSON.stringify(snapshot);
    await redis.set(key, payload, "EX", Math.max(30, snapshot.ttlSeconds));
  } catch (error) {
    if (isOfflineQueueError(error)) {
      log.debug(
        { provider: snapshot.provider, accountId: snapshot.accountId },
        "provider.balance.cache_write_skipped_offline",
      );
      return;
    }
    log.warn(
      { err: error, provider: snapshot.provider, accountId: snapshot.accountId },
      "provider.balance.cache_write_failed",
    );
  }
}
