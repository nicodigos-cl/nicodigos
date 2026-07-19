import "server-only";

import Redis from "ioredis";

declare global {
  // eslint-disable-next-line no-var
  var redisGlobal: Redis | undefined;
  // eslint-disable-next-line no-var
  var redisReadyPromise: Promise<Redis | null> | undefined;
}

function createRedis(): Redis | null {
  const url = process.env.REDIS_URL?.trim() || "redis://127.0.0.1:6379";

  try {
    const client = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: true,
    });

    client.on("error", () => {
      // Errors are handled per-call; avoid crashing the process.
    });

    return client;
  } catch {
    return null;
  }
}

export function getRedis(): Redis | null {
  if (!globalThis.redisGlobal) {
    globalThis.redisGlobal = createRedis() ?? undefined;
  }
  return globalThis.redisGlobal ?? null;
}

/**
 * Returns a connected Redis client, or null if Redis is unavailable.
 * Serializes concurrent connect attempts (safe with lazyConnect + enableOfflineQueue:false).
 */
export async function getReadyRedis(
  timeoutMs = 2_000,
): Promise<Redis | null> {
  const redis = getRedis();
  if (!redis) return null;
  if (redis.status === "ready") return redis;

  if (!globalThis.redisReadyPromise) {
    globalThis.redisReadyPromise = (async () => {
      try {
        if (redis.status === "ready") return redis;

        const ready = await new Promise<boolean>((resolve) => {
          if (redis.status === "ready") {
            resolve(true);
            return;
          }

          const timer = setTimeout(() => {
            cleanup();
            resolve(redis.status === "ready");
          }, timeoutMs);

          const onReady = () => {
            cleanup();
            resolve(true);
          };
          const onFail = () => {
            cleanup();
            resolve(false);
          };
          const cleanup = () => {
            clearTimeout(timer);
            redis.off("ready", onReady);
            redis.off("error", onFail);
            redis.off("end", onFail);
            redis.off("close", onFail);
          };

          redis.once("ready", onReady);
          redis.once("error", onFail);
          redis.once("end", onFail);
          redis.once("close", onFail);

          if (
            redis.status === "wait" ||
            redis.status === "end" ||
            redis.status === "close"
          ) {
            redis.connect().catch(onFail);
          }
        });

        return ready ? redis : null;
      } catch {
        return null;
      } finally {
        // Allow a later retry if this attempt failed; keep success cached via status === "ready".
        globalThis.redisReadyPromise = undefined;
      }
    })();
  }

  return globalThis.redisReadyPromise;
}
