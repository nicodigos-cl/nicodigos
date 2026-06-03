import "server-only";

import Redis from "ioredis";

const globalForRedis = globalThis as typeof globalThis & {
  redis?: Redis;
  redisUrlWarningLogged?: boolean;
};

function isValidRedisUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "redis:" || parsed.protocol === "rediss:";
  } catch {
    return false;
  }
}

export function isRedisConfigured(): boolean {
  const url = process.env.REDIS_URL?.trim();
  return Boolean(url && isValidRedisUrl(url));
}

export function getRedis(): Redis | null {
  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    return null;
  }

  if (!isValidRedisUrl(url)) {
    if (
      process.env.NODE_ENV === "development" &&
      !globalForRedis.redisUrlWarningLogged
    ) {
      globalForRedis.redisUrlWarningLogged = true;
      console.warn(
        "[redis] REDIS_URL inválida (ej. redis://localhost:6379). Caché deshabilitado.",
      );
    }
    return null;
  }

  if (!globalForRedis.redis) {
    globalForRedis.redis = new Redis(url, {
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
      lazyConnect: true,
    });
  }

  return globalForRedis.redis;
}
