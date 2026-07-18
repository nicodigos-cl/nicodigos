import "server-only";

import Redis from "ioredis";

declare global {
  // eslint-disable-next-line no-var
  var redisGlobal: Redis | undefined;
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
  if (process.env.NODE_ENV !== "production") {
    if (!globalThis.redisGlobal) {
      globalThis.redisGlobal = createRedis() ?? undefined;
    }
    return globalThis.redisGlobal ?? null;
  }

  if (!globalThis.redisGlobal) {
    globalThis.redisGlobal = createRedis() ?? undefined;
  }
  return globalThis.redisGlobal ?? null;
}
