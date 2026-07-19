import { describe, expect, test } from "bun:test";

import { isKinguinManualReviewError } from "@/lib/deliveries/kinguin-errors";
import { KinguinApiError } from "@/lib/kinguin-client";

describe("isKinguinManualReviewError", () => {
  test("treats insufficient funds as manual review", () => {
    expect(
      isKinguinManualReviewError(
        new KinguinApiError("Kinguin (400): Insufficient credit", {
          status: 400,
          detail: "Insufficient credit",
        }),
      ),
    ).toBe(true);
  });

  test("treats other 4xx business errors as manual review", () => {
    expect(
      isKinguinManualReviewError(
        new KinguinApiError("Kinguin (422): Invalid offer", { status: 422 }),
      ),
    ).toBe(true);
  });

  test("keeps 429 and 5xx retryable", () => {
    expect(
      isKinguinManualReviewError(
        new KinguinApiError("Kinguin (429): rate limit", { status: 429 }),
      ),
    ).toBe(false);
    expect(
      isKinguinManualReviewError(
        new KinguinApiError("Kinguin (503): unavailable", { status: 503 }),
      ),
    ).toBe(false);
  });

  test("keeps network errors without status retryable", () => {
    expect(
      isKinguinManualReviewError(new KinguinApiError("timeout")),
    ).toBe(false);
  });

  test("ignores non-Kinguin errors", () => {
    expect(isKinguinManualReviewError(new Error("boom"))).toBe(false);
  });
});
