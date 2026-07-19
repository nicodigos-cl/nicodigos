import { describe, expect, test } from "bun:test";

import {
  providerBalanceRedisKey,
  sanitizeProviderError,
} from "@/lib/providers/balance-types";

describe("provider balance helpers", () => {
  test("builds namespaced redis keys without secrets", () => {
    expect(providerBalanceRedisKey("KINGUIN", "default")).toBe(
      "provider-balance:kinguin:default",
    );
    expect(providerBalanceRedisKey("SMM", "prov_123")).toBe(
      "provider-balance:smm:prov_123",
    );
  });

  test("sanitizes api keys from error messages", () => {
    const sanitized = sanitizeProviderError(
      "Denied Bearer abc.def api_key=supersecret X-Api-Key: xyz",
    );
    expect(sanitized).not.toContain("supersecret");
    expect(sanitized).not.toContain("xyz");
    expect(sanitized).toContain("[redacted]");
  });
});
