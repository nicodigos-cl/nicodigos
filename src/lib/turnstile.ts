/** Cloudflare Turnstile always-pass test keys (visible widget). */
export const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";
export const TURNSTILE_TEST_SECRET_KEY =
  "1x0000000000000000000000000000000AA";

export const turnstileSiteKey =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? TURNSTILE_TEST_SITE_KEY;

export const turnstileSecretKey =
  process.env.TURNSTILE_SECRET_KEY ?? TURNSTILE_TEST_SECRET_KEY;

export function turnstileFetchOptions(token: string) {
  return {
    headers: {
      "x-captcha-response": token,
    },
  } as const;
}
