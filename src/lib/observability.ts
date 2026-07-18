import { H } from "@highlight-run/node";

import { createLogger } from "@/lib/logger";

const log = createLogger({ module: "observability" });

/**
 * Highlight.io — lighter error/observability dashboard than Sentry.
 * Set `HIGHLIGHT_PROJECT_ID` to enable (free tier at https://app.highlight.io).
 */
export function initObservability(): void {
  const projectID = process.env.HIGHLIGHT_PROJECT_ID?.trim();
  if (!projectID) {
    return;
  }

  if (H.isInitialized()) {
    return;
  }

  H.init({
    projectID,
    serviceName: process.env.SERVICE_NAME ?? "nicodigos",
    serviceVersion:
      process.env.SERVICE_VERSION ?? process.env.VERCEL_GIT_COMMIT_SHA,
    environment: process.env.NODE_ENV ?? "development",
  });

  log.info({ projectID }, "Highlight observability initialized");
}

export function captureException(
  error: unknown,
  metadata?: Record<string, string | number | boolean | undefined>,
): void {
  const err = error instanceof Error ? error : new Error(String(error));

  if (!process.env.HIGHLIGHT_PROJECT_ID?.trim()) {
    return;
  }

  if (!H.isInitialized()) {
    initObservability();
  }

  const attrs: Record<string, string | number | boolean> = {};
  if (metadata) {
    for (const [key, value] of Object.entries(metadata)) {
      if (value !== undefined) {
        attrs[key] = value;
      }
    }
  }

  H.consumeError(err, undefined, undefined, attrs);
}

export async function flushObservability(): Promise<void> {
  if (H.isInitialized()) {
    await H.flush();
  }
}
