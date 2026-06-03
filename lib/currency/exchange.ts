import "server-only";

import { getCachedJson, setCachedJson } from "@/lib/redis/cache";
import {
  APP_CURRENCY,
  KINGUIN_SOURCE_CURRENCY,
} from "@/lib/currency/constants";
import { getFrankfurterSdk } from "@/lib/currency/frankfurter-client";

const FX_CACHE_KEY = "fx:EUR:CLP";
const FX_CACHE_TTL_SECONDS = 6 * 60 * 60;

export type ExchangeRateSnapshot = {
  from: typeof KINGUIN_SOURCE_CURRENCY;
  to: typeof APP_CURRENCY;
  rate: number;
  fetchedAt: string;
  provider: "frankfurter-js" | "env";
};

function getEnvFallbackRate(): number | null {
  const raw = process.env.EXCHANGE_RATE_EUR_CLP?.trim();
  if (!raw) {
    return null;
  }
  const rate = Number(raw);
  return Number.isFinite(rate) && rate > 0 ? rate : null;
}

async function fetchEurToClpFromSdk(): Promise<number> {
  const rates = await getFrankfurterSdk().latest({
    base: KINGUIN_SOURCE_CURRENCY,
    quotes: [APP_CURRENCY],
  });

  const clpRate = rates.find((entry) => entry.quote === APP_CURRENCY);

  if (!clpRate?.rate || !Number.isFinite(clpRate.rate) || clpRate.rate <= 0) {
    throw new Error("Frankfurter SDK no devolvió un tipo de cambio CLP válido");
  }

  return clpRate.rate;
}

export async function getEurToClpRate(): Promise<ExchangeRateSnapshot> {
  const cached = await getCachedJson<ExchangeRateSnapshot>(FX_CACHE_KEY);
  if (cached) {
    return cached;
  }

  try {
    const rate = await fetchEurToClpFromSdk();
    const snapshot: ExchangeRateSnapshot = {
      from: KINGUIN_SOURCE_CURRENCY,
      to: APP_CURRENCY,
      rate,
      fetchedAt: new Date().toISOString(),
      provider: "frankfurter-js",
    };
    await setCachedJson(FX_CACHE_KEY, snapshot, FX_CACHE_TTL_SECONDS);
    return snapshot;
  } catch (error) {
    const fallback = getEnvFallbackRate();
    if (fallback) {
      return {
        from: KINGUIN_SOURCE_CURRENCY,
        to: APP_CURRENCY,
        rate: fallback,
        fetchedAt: new Date().toISOString(),
        provider: "env",
      };
    }

    const message =
      error instanceof Error
        ? error.message
        : "No se pudo obtener el tipo de cambio";
    throw new Error(
      `${message}. Configura EXCHANGE_RATE_EUR_CLP en .env como respaldo.`,
    );
  }
}
