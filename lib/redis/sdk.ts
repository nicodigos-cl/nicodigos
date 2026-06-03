import "server-only";

import Redis from "ioredis";
import { getRedis, isRedisConfigured } from "@/lib/redis/client";

/**
 * Cache SDK backed by the ioredis client (official Redis Node.js driver).
 */
export class RedisCacheSdk {
  constructor(private readonly redis: Redis) {}

  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  async set(
    key: string,
    value: string,
    ttlSeconds?: number,
  ): Promise<"OK" | null> {
    if (ttlSeconds && ttlSeconds > 0) {
      return this.redis.set(key, value, "EX", ttlSeconds);
    }
    return this.redis.set(key, value);
  }

  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.get(key);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async setJson(
    key: string,
    value: unknown,
    ttlSeconds?: number,
  ): Promise<"OK" | null> {
    return this.set(key, JSON.stringify(value), ttlSeconds);
  }
}

let cacheSdk: RedisCacheSdk | null = null;

export function getRedisCacheSdk(): RedisCacheSdk | null {
  const redis = getRedis();
  if (!redis) {
    return null;
  }

  if (!cacheSdk) {
    cacheSdk = new RedisCacheSdk(redis);
  }

  return cacheSdk;
}

export { isRedisConfigured };
