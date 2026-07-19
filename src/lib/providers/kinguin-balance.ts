import "server-only";

import { getKinguinClient } from "@/lib/kinguin-client";
import { createLogger } from "@/lib/logger";
import {
  readProviderBalanceCache,
  writeProviderBalanceCache,
} from "@/lib/providers/balance-cache";
import {
  sanitizeProviderError,
  type ProviderBalanceSnapshot,
} from "@/lib/providers/balance-types";

const log = createLogger({ module: "kinguin-balance" });

export const KINGUIN_BALANCE_ACCOUNT_ID = "default";
export const KINGUIN_BALANCE_TTL_SECONDS = 5 * 60;

/**
 * Official ESA endpoint: `GET /v1/balance` (see KinguinClient.getBalance).
 * Returns UNKNOWN when the call fails — never invent a balance.
 */
export async function getKinguinBalance(options?: {
  forceRefresh?: boolean;
}): Promise<ProviderBalanceSnapshot> {
  const accountId = KINGUIN_BALANCE_ACCOUNT_ID;
  const ttlSeconds = KINGUIN_BALANCE_TTL_SECONDS;

  if (!options?.forceRefresh) {
    const cached = await readProviderBalanceCache("KINGUIN", accountId);
    if (cached) {
      return { ...cached, source: "cache" };
    }
  }

  try {
    const remote = await getKinguinClient().getBalance();
    const balance = Number(remote.balance);
    if (!Number.isFinite(balance)) {
      const snapshot: ProviderBalanceSnapshot = {
        provider: "KINGUIN",
        accountId,
        balance: null,
        currency: "EUR",
        checkedAt: new Date().toISOString(),
        status: "UNKNOWN",
        source: "api",
        ttlSeconds,
        lastError: "Respuesta de balance Kinguin no numérica",
      };
      await writeProviderBalanceCache(snapshot);
      return snapshot;
    }

    const snapshot: ProviderBalanceSnapshot = {
      provider: "KINGUIN",
      accountId,
      balance,
      currency: "EUR",
      checkedAt: new Date().toISOString(),
      status: "AVAILABLE",
      source: "api",
      ttlSeconds,
      lastError: null,
    };
    await writeProviderBalanceCache(snapshot);
    return snapshot;
  } catch (error) {
    const lastError = sanitizeProviderError(
      error instanceof Error ? error.message : "Error consultando balance Kinguin",
    );
    log.warn({ err: error }, "kinguin.balance.fetch_failed");
    const snapshot: ProviderBalanceSnapshot = {
      provider: "KINGUIN",
      accountId,
      balance: null,
      currency: "EUR",
      checkedAt: new Date().toISOString(),
      status: "ERROR",
      source: "api",
      ttlSeconds: Math.min(ttlSeconds, 60),
      lastError,
    };
    await writeProviderBalanceCache(snapshot);
    return snapshot;
  }
}

/** Mark cached Kinguin balance as insufficient after a funds error. */
export async function markKinguinBalanceInsufficient(
  message?: string,
): Promise<void> {
  const current = await getKinguinBalance();
  await writeProviderBalanceCache({
    ...current,
    status: "INSUFFICIENT",
    checkedAt: new Date().toISOString(),
    source: "api",
    ttlSeconds: 60,
    lastError: sanitizeProviderError(message ?? "Fondos insuficientes en Kinguin"),
  });
}
