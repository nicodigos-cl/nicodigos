export function formatCustomerOrderNumber(orderId: string): string {
  const suffix = orderId.replace(/[^a-zA-Z0-9]/g, "").slice(-8).toUpperCase();
  return `#NC-${suffix || orderId.slice(0, 8).toUpperCase()}`;
}

export function abbreviateUrl(value: string | null | undefined, max = 42): string {
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
  return process.env.SUPPORT_EMAIL?.trim() || "soporte@nicodigos.com";
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
