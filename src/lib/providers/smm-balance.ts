import "server-only";

import { createLogger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import {
  readProviderBalanceCache,
  writeProviderBalanceCache,
} from "@/lib/providers/balance-cache";
import {
  sanitizeProviderError,
  type ProviderBalanceSnapshot,
} from "@/lib/providers/balance-types";
import { SmmService } from "@/lib/smm-service";

const log = createLogger({ module: "smm-balance" });

export const SMM_BALANCE_TTL_SECONDS = 5 * 60;

export async function getSmmProviderBalance(
  providerId: string,
  options?: { forceRefresh?: boolean },
): Promise<ProviderBalanceSnapshot> {
  const ttlSeconds = SMM_BALANCE_TTL_SECONDS;

  if (!options?.forceRefresh) {
    const cached = await readProviderBalanceCache("SMM", providerId);
    if (cached) {
      return { ...cached, source: "cache" };
    }
  }

  const provider = await prisma.smmProvider.findUnique({
    where: { id: providerId },
    select: { id: true, apiUrl: true, apiKey: true, status: true },
  });

  if (!provider || provider.status !== "ACTIVE") {
    return {
      provider: "SMM",
      accountId: providerId,
      balance: null,
      currency: null,
      checkedAt: new Date().toISOString(),
      status: "UNKNOWN",
      source: "unavailable",
      ttlSeconds,
      lastError: "Proveedor SMM inactivo o inexistente",
    };
  }

  try {
    const client = new SmmService({
      apiUrl: provider.apiUrl,
      apiKey: provider.apiKey,
    });
    const remote = await client.balance();
    const balance = Number.parseFloat(String(remote.balance));
    if (!Number.isFinite(balance)) {
      const snapshot: ProviderBalanceSnapshot = {
        provider: "SMM",
        accountId: providerId,
        balance: null,
        currency: remote.currency ?? "USD",
        checkedAt: new Date().toISOString(),
        status: "UNKNOWN",
        source: "api",
        ttlSeconds,
        lastError: "Respuesta de balance SMM no numérica",
      };
      await writeProviderBalanceCache(snapshot);
      return snapshot;
    }

    const snapshot: ProviderBalanceSnapshot = {
      provider: "SMM",
      accountId: providerId,
      balance,
      currency: remote.currency || "USD",
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
      error instanceof Error ? error.message : "Error consultando balance SMM",
    );
    log.warn({ err: error, providerId }, "smm.balance.fetch_failed");
    const snapshot: ProviderBalanceSnapshot = {
      provider: "SMM",
      accountId: providerId,
      balance: null,
      currency: null,
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

export async function getSmmProviderBalanceByApiUrl(
  apiUrl: string,
  options?: { forceRefresh?: boolean },
): Promise<ProviderBalanceSnapshot | null> {
  const provider = await prisma.smmProvider.findFirst({
    where: { apiUrl, status: "ACTIVE" },
    select: { id: true },
  });
  if (!provider) return null;
  return getSmmProviderBalance(provider.id, options);
}

export async function markSmmBalanceInsufficient(
  providerId: string,
  message?: string,
): Promise<void> {
  const current = await getSmmProviderBalance(providerId);
  await writeProviderBalanceCache({
    ...current,
    status: "INSUFFICIENT",
    checkedAt: new Date().toISOString(),
    source: "api",
    ttlSeconds: 60,
    lastError: sanitizeProviderError(message ?? "Fondos insuficientes en panel SMM"),
  });
}
