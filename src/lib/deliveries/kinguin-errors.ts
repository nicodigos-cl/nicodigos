import { KinguinApiError } from "@/lib/kinguin-client";

/**
 * Whether a Kinguin API failure should stop auto-retries and go to MANUAL_REVIEW.
 * Mirrors the SMM policy: do not blindly re-purchase after a conclusive provider error.
 * Retries stay for rate limits, 5xx, and network errors without a status (timeouts).
 */
export function isKinguinManualReviewError(error: unknown): boolean {
  if (!(error instanceof KinguinApiError)) {
    return false;
  }

  const message = `${error.message} ${error.detail ?? ""}`;
  if (
    /insufficient|not enough|low balance|no funds|fondos|credit|price|offer|not found|invalid|forbidden|unauthorized/i.test(
      message,
    )
  ) {
    return true;
  }

  const status = error.status;
  if (status == null) return false;
  if (status === 429) return false;
  if (status >= 500) return false;
  // Conclusive client / business errors (incl. 4xx without status edge cases).
  return status >= 400 && status < 500;
}
