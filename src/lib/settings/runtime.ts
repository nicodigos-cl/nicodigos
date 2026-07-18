import "server-only";

import { getStoreSettings } from "@/lib/settings/queries";
import type { StoreSettingsDto } from "@/types/settings";

let memoryCache: { value: StoreSettingsDto; expiresAt: number } | null = null;
const CACHE_MS = 5_000;

export async function getOperationalSettings(): Promise<StoreSettingsDto> {
  const now = Date.now();
  if (memoryCache && memoryCache.expiresAt > now) {
    return memoryCache.value;
  }
  const value = await getStoreSettings();
  memoryCache = { value, expiresAt: now + CACHE_MS };
  return value;
}

export function invalidateOperationalSettingsCache() {
  memoryCache = null;
}

export async function getBusinessTimezone(): Promise<string> {
  const settings = await getOperationalSettings();
  return settings.timezone || "America/Santiago";
}

export async function getLowStockThreshold(): Promise<number> {
  const settings = await getOperationalSettings();
  return settings.keysLowStockThreshold;
}

export async function assertStoreAllowsCheckout(): Promise<
  { ok: true } | { ok: false; message: string }
> {
  const settings = await getOperationalSettings();

  if (!settings.checkoutEnabled) {
    return {
      ok: false,
      message: "El checkout está temporalmente desactivado.",
    };
  }

  if (settings.storeStatus === "CLOSED") {
    return {
      ok: false,
      message: settings.availabilityMessage || "La tienda está cerrada.",
    };
  }

  if (settings.storeStatus === "MAINTENANCE") {
    return {
      ok: false,
      message:
        settings.maintenanceMessage ||
        "La tienda está en mantenimiento. Intenta más tarde.",
    };
  }

  if (settings.storeStatus === "READ_ONLY") {
    return {
      ok: false,
      message:
        settings.availabilityMessage ||
        "La tienda está en modo solo lectura. No se aceptan pedidos.",
    };
  }

  if (!settings.flowEnabled) {
    return {
      ok: false,
      message: "Los pagos no están disponibles en este momento.",
    };
  }

  return { ok: true };
}
