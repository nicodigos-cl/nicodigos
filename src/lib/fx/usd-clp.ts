import "server-only";

import {
  FX_USD_CLP_CACHE_KEY,
  FX_USD_CLP_TTL_SECONDS,
} from "@/lib/smm-services/constants";
import { getRedis } from "@/lib/redis";

export { applyMarkupPct } from "@/lib/fx/markup";

type MindicadorDolarResponse = {
  serie?: Array<{ valor?: number }>;
};

async function fetchUsdClpFromMindicador(): Promise<number> {
  const response = await fetch("https://mindicador.cl/api/dolar", {
    next: { revalidate: FX_USD_CLP_TTL_SECONDS },
  });

  if (!response.ok) {
    throw new Error(`No se pudo obtener el tipo de cambio (${response.status})`);
  }

  const data = (await response.json()) as MindicadorDolarResponse;
  const value = data.serie?.[0]?.valor;

  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error("Respuesta de tipo de cambio inválida");
  }

  return value;
}

export async function getUsdToClpRate(): Promise<number> {
  const redis = getRedis();

  if (redis) {
    try {
      if (redis.status !== "ready") {
        await redis.connect().catch(() => undefined);
      }
      const cached = await redis.get(FX_USD_CLP_CACHE_KEY);
      if (cached) {
        const parsed = Number.parseFloat(cached);
        if (Number.isFinite(parsed) && parsed > 0) {
          return parsed;
        }
      }
    } catch {
      // Fall through to network fetch.
    }
  }

  const rate = await fetchUsdClpFromMindicador();

  if (redis) {
    try {
      await redis.set(
        FX_USD_CLP_CACHE_KEY,
        String(rate),
        "EX",
        FX_USD_CLP_TTL_SECONDS,
      );
    } catch {
      // Ignore cache write failures.
    }
  }

  return rate;
}

/** Convert USD amount to CLP integer pesos. */
export async function usdToClp(amountUsd: number): Promise<number> {
  if (!Number.isFinite(amountUsd) || amountUsd < 0) {
    return 0;
  }
  const rate = await getUsdToClpRate();
  return Math.round(amountUsd * rate);
}
