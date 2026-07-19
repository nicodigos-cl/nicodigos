import "server-only";

import { createLogger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { getReadyRedis } from "@/lib/redis";
import {
  getKinguinBalance,
  markKinguinBalanceInsufficient,
} from "@/lib/providers/kinguin-balance";
import {
  getSmmProviderBalance,
  markSmmBalanceInsufficient,
} from "@/lib/providers/smm-balance";
import type {
  ProviderBalanceKind,
  ProviderBalanceSnapshot,
} from "@/lib/providers/balance-types";

const log = createLogger({ module: "provider-balance" });

const ADMIN_REFRESH_LIMIT_KEY = "provider-balance:admin-refresh";
const ADMIN_REFRESH_LIMIT = 10;
const ADMIN_REFRESH_WINDOW_SECONDS = 60;

export async function getProviderBalance(
  provider: ProviderBalanceKind,
  accountId: string,
  options?: { forceRefresh?: boolean },
): Promise<ProviderBalanceSnapshot> {
  if (provider === "KINGUIN") {
    return getKinguinBalance(options);
  }
  return getSmmProviderBalance(accountId, options);
}

export async function refreshProviderBalances(options?: {
  forceRefresh?: boolean;
  providerIds?: string[];
}): Promise<{
  kinguin: ProviderBalanceSnapshot;
  smm: ProviderBalanceSnapshot[];
}> {
  const forceRefresh = options?.forceRefresh ?? true;
  const providerWhere = options?.providerIds?.length
    ? { id: { in: options.providerIds }, status: "ACTIVE" as const }
    : { status: "ACTIVE" as const };

  const providers = await prisma.smmProvider.findMany({
    where: providerWhere,
    select: { id: true },
  });

  const [kinguin, ...smm] = await Promise.all([
    getKinguinBalance({ forceRefresh }),
    ...providers.map((provider) =>
      getSmmProviderBalance(provider.id, { forceRefresh }),
    ),
  ]);

  log.info(
    {
      kinguinStatus: kinguin.status,
      smmCount: smm.length,
      smmErrors: smm.filter((row) => row.status === "ERROR").length,
    },
    "provider.balances.refreshed",
  );

  return { kinguin, smm };
}

export async function assertAdminBalanceRefreshAllowed(
  actorUserId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const redis = await getReadyRedis();
  if (!redis) return { ok: true };

  const key = `${ADMIN_REFRESH_LIMIT_KEY}:${actorUserId}`;
  try {
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, ADMIN_REFRESH_WINDOW_SECONDS);
    }
    if (count > ADMIN_REFRESH_LIMIT) {
      return {
        ok: false,
        message: "Demasiadas consultas de saldo. Espera un minuto.",
      };
    }
  } catch {
    // Fail open if Redis is down.
  }
  return { ok: true };
}

export async function refreshBalancesAfterPurchase(input: {
  provider: ProviderBalanceKind;
  accountId?: string | null;
}): Promise<void> {
  try {
    if (input.provider === "KINGUIN") {
      await getKinguinBalance({ forceRefresh: true });
      return;
    }
    if (input.accountId) {
      await getSmmProviderBalance(input.accountId, { forceRefresh: true });
    }
  } catch (error) {
    log.warn({ err: error, provider: input.provider }, "provider.balance.post_purchase_refresh_failed");
  }
}

export async function refreshBalancesAfterInsufficientFunds(input: {
  provider: ProviderBalanceKind;
  accountId?: string | null;
  message?: string;
}): Promise<void> {
  try {
    if (input.provider === "KINGUIN") {
      await markKinguinBalanceInsufficient(input.message);
      return;
    }
    if (input.accountId) {
      await markSmmBalanceInsufficient(input.accountId, input.message);
    }
  } catch (error) {
    log.warn(
      { err: error, provider: input.provider },
      "provider.balance.insufficient_mark_failed",
    );
  }
}

export {
  getKinguinBalance,
  getSmmProviderBalance,
  markKinguinBalanceInsufficient,
  markSmmBalanceInsufficient,
};
