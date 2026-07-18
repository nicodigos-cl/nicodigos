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

/**
 * Full navigation after auth so the session cookie is visible to proxy/SSR.
 * Soft `router.push` can race the cookie and bounce back to login.
 */
export function navigateAfterAuth(
  callbackURL: string | null | undefined = AUTH_HOME_PATH,
): void {
  window.location.assign(resolveSafeCallbackUrl(callbackURL));
}
