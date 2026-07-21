import "server-only";

import { getReadyRedis } from "@/lib/redis";

type MemoryEntry = {
  rate: number;
  fetchedAt: number;
};

type RateSource = {
  name: string;
  fetch: () => Promise<number>;
};

const memoryByKey = new Map<string, MemoryEntry>();
const inflightByKey = new Map<string, Promise<number>>();

/** Soft TTL for process-local cache (aligned with Redis). */
const MEMORY_FRESH_MS = 60 * 60 * 1000;
/** Allow stale memory/redis values when all upstreams fail. */
const MEMORY_STALE_MS = 24 * 60 * 60 * 1000;

const FX_FETCH_TIMEOUT_MS = 4_000;

export function parsePositiveRate(value: unknown): number | null {
  const rate =
    typeof value === "number" ? value : Number.parseFloat(String(value ?? ""));
  if (!Number.isFinite(rate) || rate <= 0) return null;
  return rate;
}

export async function fetchJsonWithTimeout(
  url: string,
  timeoutMs = FX_FETCH_TIMEOUT_MS,
): Promise<Response> {
  return fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
}

function readMemory(cacheKey: string, maxAgeMs: number): number | null {
  const entry = memoryByKey.get(cacheKey);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > maxAgeMs) return null;
  return entry.rate;
}

function writeMemory(cacheKey: string, rate: number) {
  memoryByKey.set(cacheKey, { rate, fetchedAt: Date.now() });
}

async function readRedis(
  cacheKey: string,
): Promise<number | null> {
  const redis = await getReadyRedis();
  if (!redis) return null;
  try {
    const cached = await redis.get(cacheKey);
    return parsePositiveRate(cached);
  } catch {
    return null;
  }
}

async function writeRedis(
  cacheKey: string,
  rate: number,
  ttlSeconds: number,
) {
  const redis = await getReadyRedis();
  if (!redis) return;
  try {
    await redis.set(cacheKey, String(rate), "EX", ttlSeconds);
  } catch {
    // Ignore cache write failures.
  }
}

async function fetchFirstSuccessful(sources: RateSource[]): Promise<number> {
  const errors: string[] = [];

  for (const source of sources) {
    try {
      const rate = await source.fetch();
      const parsed = parsePositiveRate(rate);
      if (parsed == null) {
        errors.push(`${source.name}: inválido`);
        continue;
      }
      return parsed;
    } catch (error) {
      const message =
        error instanceof Error ? error.message.slice(0, 80) : "error";
      errors.push(`${source.name}: ${message}`);
    }
  }

  throw new Error(
    `No se pudo obtener el tipo de cambio (${errors.join(" · ") || "sin fuentes"})`,
  );
}

/**
 * Resolve a FX rate with: Redis → memory → upstreams (single-flight)
 * → stale memory as last resort.
 */
export async function getCachedFxRate(options: {
  cacheKey: string;
  ttlSeconds: number;
  sources: RateSource[];
}): Promise<number> {
  const { cacheKey, ttlSeconds, sources } = options;

  const fromRedis = await readRedis(cacheKey);
  if (fromRedis != null) {
    writeMemory(cacheKey, fromRedis);
    return fromRedis;
  }

  const fromMemory = readMemory(cacheKey, MEMORY_FRESH_MS);
  if (fromMemory != null) {
    return fromMemory;
  }

  let pending = inflightByKey.get(cacheKey);
  if (!pending) {
    pending = (async () => {
      try {
        const rate = await fetchFirstSuccessful(sources);
        writeMemory(cacheKey, rate);
        await writeRedis(cacheKey, rate, ttlSeconds);
        return rate;
      } catch (error) {
        const stale = readMemory(cacheKey, MEMORY_STALE_MS);
        if (stale != null) {
          return stale;
        }
        throw error;
      } finally {
        inflightByKey.delete(cacheKey);
      }
    })();
    inflightByKey.set(cacheKey, pending);
  }

  return pending;
}
