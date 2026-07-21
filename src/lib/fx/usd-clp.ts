import "server-only";

import {
  fetchJsonWithTimeout,
  getCachedFxRate,
  parsePositiveRate,
} from "@/lib/fx/cached-rate";
import {
  FX_USD_CLP_CACHE_KEY,
  FX_USD_CLP_TTL_SECONDS,
} from "@/lib/smm-services/constants";

export { applyMarkupPct } from "@/lib/fx/markup";

type MindicadorDolarResponse = {
  serie?: Array<{ valor?: number }>;
};

type OpenErApiResponse = {
  result?: string;
  rates?: { CLP?: number };
};

async function fetchUsdClpFromMindicador(): Promise<number> {
  const response = await fetchJsonWithTimeout(
    "https://mindicador.cl/api/dolar",
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = (await response.json()) as MindicadorDolarResponse;
  const value = parsePositiveRate(data.serie?.[0]?.valor);
  if (value == null) {
    throw new Error("respuesta inválida");
  }
  return value;
}

async function fetchUsdClpFromOpenErApi(): Promise<number> {
  const response = await fetchJsonWithTimeout(
    "https://open.er-api.com/v6/latest/USD",
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

export async function getUsdToClpRate(): Promise<number> {
  return getCachedFxRate({
    cacheKey: FX_USD_CLP_CACHE_KEY,
    ttlSeconds: FX_USD_CLP_TTL_SECONDS,
    sources: [
      { name: "mindicador", fetch: fetchUsdClpFromMindicador },
      { name: "open-er-api", fetch: fetchUsdClpFromOpenErApi },
    ],
  });
}

/** Convert USD amount to CLP integer pesos. */
export async function usdToClp(amountUsd: number): Promise<number> {
  if (!Number.isFinite(amountUsd) || amountUsd < 0) {
    return 0;
  }
  const rate = await getUsdToClpRate();
  return Math.round(amountUsd * rate);
}
