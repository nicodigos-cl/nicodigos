import "server-only";

import {
  FX_EUR_CLP_CACHE_KEY,
  FX_EUR_CLP_TTL_SECONDS,
} from "@/lib/smm-services/constants";
import { getRedis } from "@/lib/redis";

export { applyMarkupPct } from "@/lib/fx/markup";

type MindicadorEuroResponse = {
  serie?: Array<{ valor?: number }>;
};

async function fetchEurClpFromMindicador(): Promise<number> {
  const response = await fetch("https://mindicador.cl/api/euro", {
    next: { revalidate: FX_EUR_CLP_TTL_SECONDS },
  });

  if (!response.ok) {
    throw new Error(`No se pudo obtener EUR/CLP (${response.status})`);
  }

  const data = (await response.json()) as MindicadorEuroResponse;
  const value = data.serie?.[0]?.valor;

  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error("Respuesta EUR/CLP inválida");
  }

  return value;
}

export async function getEurToClpRate(): Promise<number> {
  const redis = getRedis();

  if (redis) {
    try {
      if (redis.status !== "ready") {
        await redis.connect().catch(() => undefined);
      }
      const cached = await redis.get(FX_EUR_CLP_CACHE_KEY);
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

  const rate = await fetchEurClpFromMindicador();

  if (redis) {
    try {
      await redis.set(
        FX_EUR_CLP_CACHE_KEY,
        String(rate),
        "EX",
        FX_EUR_CLP_TTL_SECONDS,
      );
    } catch {
      // Ignore cache write failures.
    }
  }

  return rate;
}

/** Convert EUR amount to CLP integer pesos. */
export async function eurToClp(amountEur: number): Promise<number> {
  if (!Number.isFinite(amountEur) || amountEur < 0) {
    return 0;
  }
  const rate = await getEurToClpRate();
  return Math.round(amountEur * rate);
}
