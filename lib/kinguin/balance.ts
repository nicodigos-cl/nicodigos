import { getKinguinSdk, isKinguinConfigured } from "@/lib/kinguin/client";
import { getRedisCacheSdk } from "@/lib/redis/sdk";

const BALANCE_CACHE_KEY = "kinguin:balance:cached";
const CACHE_TTL_SECONDS = 300; // 5 minutes

interface MemoryCache {
  balance: number;
  updatedAt: number;
}

let memoryCache: MemoryCache | null = null;

export async function getKinguinBalanceCached(): Promise<number> {
  if (!isKinguinConfigured()) {
    return 0;
  }

  // 1. Try Redis cache
  const redisCache = getRedisCacheSdk();
  if (redisCache) {
    try {
      const cached = await redisCache.get(BALANCE_CACHE_KEY);
      if (cached !== null) {
        const parsed = parseFloat(cached);
        if (!isNaN(parsed)) {
          return parsed;
        }
      }
    } catch (err) {
      console.error("Error reading balance from Redis:", err);
    }
  }

  // 2. Try Memory cache fallback (if not expired)
  const now = Date.now();
  if (memoryCache && now - memoryCache.updatedAt < CACHE_TTL_SECONDS * 1000) {
    return memoryCache.balance;
  }

  // 3. Fetch from Kinguin API
  try {
    const sdk = getKinguinSdk();
    const balanceData = await sdk.getBalance();
    const balance = balanceData.balance;

    // 4. Save to Redis
    if (redisCache) {
      try {
        await redisCache.set(BALANCE_CACHE_KEY, balance.toString(), CACHE_TTL_SECONDS);
      } catch (err) {
        console.error("Error writing balance to Redis:", err);
      }
    }

    // 5. Save to Memory cache
    memoryCache = {
      balance,
      updatedAt: now,
    };

    return balance;
  } catch (err) {
    console.error("Failed to fetch balance from Kinguin API:", err);
    // If API fails, return cached memory value if we have any, or 0
    return memoryCache ? memoryCache.balance : 0;
  }
}

/**
 * Manually update the cached balance.
 */
export async function updateKinguinBalanceCached(balance: number): Promise<void> {
  const redisCache = getRedisCacheSdk();
  if (redisCache) {
    try {
      await redisCache.set(BALANCE_CACHE_KEY, balance.toString(), CACHE_TTL_SECONDS);
    } catch (err) {
      console.error("Error writing balance update to Redis:", err);
    }
  }

  memoryCache = {
    balance,
    updatedAt: Date.now(),
  };
}
