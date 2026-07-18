import { AUTH_HOME_PATH } from "@/lib/auth/otp";

/**
 * Only allow same-origin relative paths for post-login redirects.
 */
export function resolveSafeCallbackUrl(
  value: string | string[] | null | undefined,
  fallback: string = AUTH_HOME_PATH,
): string {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//")) return fallback;
  if (raw.includes("://") || raw.includes("\\")) return fallback;
  return raw;
}
