import { KinguinSdk } from "@/lib/kinguin/sdk";

let sdk: KinguinSdk | null = null;

export function isKinguinConfigured(): boolean {
  return Boolean(process.env.KINGUIN_API_KEY && process.env.KINGUIN_API_BASE);
}

export function getKinguinSdk(): KinguinSdk {
  if (!isKinguinConfigured()) {
    throw new Error(
      "KINGUIN_API_KEY y KINGUIN_API_BASE deben estar configurados",
    );
  }

  if (!sdk) {
    sdk = new KinguinSdk();
  }

  return sdk;
}

/** @deprecated Use getKinguinSdk */
export const getKinguinClient = getKinguinSdk;
