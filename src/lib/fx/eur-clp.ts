import "server-only";

import {
  fetchJsonWithTimeout,
  getCachedFxRate,
  parsePositiveRate,
} from "@/lib/fx/cached-rate";
import {
  FX_EUR_CLP_CACHE_KEY,
  FX_EUR_CLP_TTL_SECONDS,
} from "@/lib/smm-services/constants";

export { applyMarkupPct } from "@/lib/fx/markup";

type MindicadorEuroResponse = {
  serie?: Array<{ valor?: number }>;
};

type OpenErApiResponse = {
  result?: string;
  rates?: { CLP?: number };
};

async function fetchEurClpFromMindicador(): Promise<number> {
  const response = await fetchJsonWithTimeout(
    "https://mindicador.cl/api/euro",
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = (await response.json()) as MindicadorEuroResponse;
  const value = parsePositiveRate(data.serie?.[0]?.valor);
  if (value == null) {
    throw new Error("respuesta inválida");
  }
  return value;
}

async function fetchEurClpFromOpenErApi(): Promise<number> {
  const response = await fetchJsonWithTimeout(
    "https://open.er-api.com/v6/latest/EUR",
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = (await response.json()) as OpenErApiResponse;
  if (data.result !== "success") {
    throw new Error("API no success");
  }
  const value = parsePositiveRate(data.rates?.CLP);
  if (value == null) {
    throw new Error("CLP ausente");
  }
  return value;
}

export async function getEurToClpRate(): Promise<number> {
  return getCachedFxRate({
    cacheKey: FX_EUR_CLP_CACHE_KEY,
    ttlSeconds: FX_EUR_CLP_TTL_SECONDS,
    sources: [
      { name: "mindicador", fetch: fetchEurClpFromMindicador },
      { name: "open-er-api", fetch: fetchEurClpFromOpenErApi },
    ],
  });
}

/** Convert EUR amount to CLP integer pesos. */
export async function eurToClp(amountEur: number): Promise<number> {
  if (!Number.isFinite(amountEur) || amountEur < 0) {
    return 0;
  }
  const rate = await getEurToClpRate();
  return Math.round(amountEur * rate);
}

/** Convert CLP amount to EUR using the cached FX rate. */
export async function clpToEur(amountClp: number): Promise<number | null> {
  if (!Number.isFinite(amountClp) || amountClp < 0) {
    return null;
  }
  const rate = await getEurToClpRate();
  if (!Number.isFinite(rate) || rate <= 0) {
    return null;
  }
  return amountClp / rate;
}

/** Pure CLP→EUR conversion when the rate is already known. */
export function clpToEurWithRate(
  amountClp: number,
  eurClpRate: number,
): number | null {
  if (
    !Number.isFinite(amountClp) ||
    amountClp < 0 ||
    !Number.isFinite(eurClpRate) ||
    eurClpRate <= 0
  ) {
    return null;
  }
  return amountClp / eurClpRate;
}
