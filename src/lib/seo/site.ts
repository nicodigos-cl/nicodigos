/** Canonical public site URL and copy for metadata / JSON-LD. */

export const SITE_NAME = "Nicodigos";
export const SITE_LEGAL_NAME = "Nicodigos";
export const SITE_LOCALE = "es_CL";
export const SITE_LANGUAGE = "es-CL";
export const SITE_COUNTRY = "CL";
export const SITE_CURRENCY = "CLP";
export const SITE_SUPPORT_EMAIL = "soporte@nicodigos.cl";

export const SITE_TAGLINE =
  "Productos digitales y servicios SMM en Chile";

export const SITE_DESCRIPTION =
  "Tienda chilena de keys digitales, videojuegos, software y servicios de marketing en redes sociales (SMM). Precios en CLP, pago con Flow y entrega digital.";

export const SITE_KEYWORDS = [
  "productos digitales Chile",
  "keys digitales",
  "videojuegos Chile",
  "gift cards Chile",
  "servicios SMM Chile",
  "marketing redes sociales",
  "seguidores Instagram",
  "Steam Chile",
  "Nicodigos",
  "CLP",
] as const;

/** Production fallback when env is missing (build / local without APP_URL). */
const DEFAULT_SITE_URL = "https://nicodigos.cl";

export function getSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.BETTER_AUTH_URL?.trim() ||
    DEFAULT_SITE_URL;
  try {
    const url = new URL(raw);
    url.pathname = "";
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return DEFAULT_SITE_URL;
  }
}

export function absoluteUrl(path = "/"): string {
  const base = getSiteUrl();
  if (!path || path === "/") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
