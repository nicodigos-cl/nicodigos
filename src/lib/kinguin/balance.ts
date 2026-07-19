import "server-only";

import { getKinguinBalance } from "@/lib/providers/kinguin-balance";
import { getCachedKinguinRegionName as getRegionName } from "@/lib/kinguin/regions-cache";

export {
  KINGUIN_BALANCE_ACCOUNT_ID as KINGUIN_BALANCE_CACHE_KEY,
  KINGUIN_BALANCE_TTL_SECONDS,
} from "@/lib/providers/kinguin-balance";

/** @deprecated Prefer getKinguinBalance from @/lib/providers/balance */
export async function getCachedKinguinBalance(): Promise<number | null> {
  const snapshot = await getKinguinBalance();
  return snapshot.balance;
}

export { getRegionName as getCachedKinguinRegionName };

/**
 * Whether our Kinguin wallet can cover the product cost right now.
 * If balance is unknown/unreliable, return false so ETA becomes delayed
 * (never invent funds).
 */
export function canAffordKinguinPurchase(
  balanceEur: number | null,
  sourceCostEur: number | null,
): boolean {
  if (sourceCostEur == null || !Number.isFinite(sourceCostEur)) {
    return true;
  }
  if (balanceEur == null || !Number.isFinite(balanceEur)) {
    return false;
  }
  return balanceEur >= sourceCostEur;
}
