import { randomBytes, timingSafeEqual } from "node:crypto";

const ACCESS_TOKEN_RE = /^[a-f0-9]{64}$/;

export function generateOrderAccessToken(): string {
  return randomBytes(32).toString("hex");
}

export function isOrderAccessTokenFormat(token: string): boolean {
  return ACCESS_TOKEN_RE.test(token);
}

export function orderAccessTokensEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function buildOrderAccessPath(orderId: string, accessToken: string): string {
  return `/checkout/${encodeURIComponent(orderId)}?s=${encodeURIComponent(accessToken)}`;
}

export function buildOrderAccessUrl(
  baseUrl: string,
  orderId: string,
  accessToken: string,
): string {
  const base = baseUrl.replace(/\/$/, "");
  return `${base}${buildOrderAccessPath(orderId, accessToken)}`;
}

export function resolvePresentedAccessToken(input: {
  queryToken?: string | null;
  cookieToken?: string | null;
}): string | null {
  const query = input.queryToken?.trim() || null;
  if (query && isOrderAccessTokenFormat(query)) return query;
  const cookie = input.cookieToken?.trim() || null;
  if (cookie && isOrderAccessTokenFormat(cookie)) return cookie;
  return null;
}
