export function formatCustomerOrderNumber(orderId: string): string {
  const suffix = orderId
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(-8)
    .toUpperCase();
  return `NC-${suffix || orderId.slice(0, 8).toUpperCase()}`;
}

/** Parse visible order number or raw id fragment for search. */
export function parseOrderSearchToken(raw: string): {
  suffix: string | null;
  exactId: string | null;
  productQuery: string;
} {
  const trimmed = raw.trim();
  const withoutHash = trimmed.replace(/^#/, "");
  const ncMatch = withoutHash.match(/^NC[-_]?([a-zA-Z0-9]{4,12})$/i);
  if (ncMatch?.[1]) {
    return {
      suffix: ncMatch[1].toUpperCase(),
      exactId: null,
      productQuery: trimmed,
    };
  }
  if (/^c[a-z0-9]{24}$/i.test(trimmed)) {
    return { suffix: null, exactId: trimmed, productQuery: trimmed };
  }
  return { suffix: null, exactId: null, productQuery: trimmed };
}

export function formatCustomerDate(
  value: string | Date | null | undefined,
  style: "short" | "long" = "short",
): string {
  if (value == null || value === "") return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  if (style === "long") {
    return new Intl.DateTimeFormat("es-CL", {
      timeZone: "America/Santiago",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function abbreviateUrl(
  value: string | null | undefined,
  max = 42,
): string {
  if (!value) return "—";
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

export function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.BETTER_AUTH_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export function supportEmail(): string {
  return process.env.SUPPORT_EMAIL?.trim() || "soporte@nicodigos.cl";
}

export function maskIpAddress(ip: string | null | undefined): string | null {
  if (!ip) return null;
  if (ip.includes(".")) {
    const parts = ip.split(".");
    if (parts.length === 4) return `${parts[0]}.${parts[1]}.•••.•••`;
  }
  if (ip.includes(":")) {
    const parts = ip.split(":");
    return `${parts.slice(0, 2).join(":")}:••••`;
  }
  return `${ip.slice(0, 4)}•••`;
}

export function summarizeUserAgent(ua: string | null | undefined): string {
  if (!ua) return "Dispositivo desconocido";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua)
      ? "Chrome"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Safari\//.test(ua)
          ? "Safari"
          : "Navegador";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Android/.test(ua)
      ? "Android"
      : /iPhone|iPad|iOS/.test(ua)
        ? "iOS"
        : /Mac OS/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "SO desconocido";
  return `${browser} · ${os}`;
}
