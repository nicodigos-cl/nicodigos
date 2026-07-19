import { describe, expect, test } from "bun:test";

import {
  buildOrderAccessPath,
  buildOrderAccessUrl,
  generateOrderAccessToken,
  isOrderAccessTokenFormat,
  orderAccessTokensEqual,
  resolvePresentedAccessToken,
} from "@/lib/orders/access-token";

describe("order access token", () => {
  test("generates a 64-char hex secret", () => {
    const token = generateOrderAccessToken();
    expect(token).toHaveLength(64);
    expect(isOrderAccessTokenFormat(token)).toBe(true);
  });

  test("compares tokens in constant time", () => {
    const token = generateOrderAccessToken();
    expect(orderAccessTokensEqual(token, token)).toBe(true);
    expect(orderAccessTokensEqual(token, generateOrderAccessToken())).toBe(
      false,
    );
    expect(orderAccessTokensEqual(token, token.slice(0, 32))).toBe(false);
  });

  test("rejects invalid token formats", () => {
    expect(isOrderAccessTokenFormat("short")).toBe(false);
    expect(isOrderAccessTokenFormat("g".repeat(64))).toBe(false);
    expect(isOrderAccessTokenFormat("A".repeat(64))).toBe(false);
  });

  test("builds checkout capability URLs", () => {
    const orderId = "clxyzorder123";
    const token = "a".repeat(64);
    expect(buildOrderAccessPath(orderId, token)).toBe(
      `/checkout/${orderId}?s=${token}`,
    );
    expect(
      buildOrderAccessUrl("https://nicodigos.cl/", orderId, token),
    ).toBe(`https://nicodigos.cl/checkout/${orderId}?s=${token}`);
  });

  test("prefers a valid query token over the cookie", () => {
    const query = "b".repeat(64);
    const cookie = "c".repeat(64);
    expect(
      resolvePresentedAccessToken({ queryToken: query, cookieToken: cookie }),
    ).toBe(query);
    expect(
      resolvePresentedAccessToken({
        queryToken: "bad",
        cookieToken: cookie,
      }),
    ).toBe(cookie);
    expect(resolvePresentedAccessToken({ queryToken: "bad" })).toBeNull();
  });
});
