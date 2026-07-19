import * as Sentry from "@sentry/node";

import { createLogger } from "@/lib/logger";

const log = createLogger({ module: "observability" });

/**
 * Sentry — server-side error monitoring.
 * Set `SENTRY_DSN` to enable (https://sentry.io → Project → Client Keys / DSN).
 */
export function initObservability(): void {
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn || Sentry.isInitialized()) {
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "development",
    release:
      process.env.SERVICE_VERSION ??
      process.env.VERCEL_GIT_COMMIT_SHA ??
      undefined,
    serverName: process.env.SERVICE_NAME ?? "nicodigos",
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0"),
  });

  log.info({ dsnHost: safeDsnHost(dsn) }, "Sentry observability initialized");
}

function safeDsnHost(dsn: string): string {
  try {
    return new URL(dsn).host;
  } catch {
    return "invalid-dsn";
  }
}

export function captureException(
  error: unknown,
  metadata?: Record<string, string | number | boolean | undefined>,
): void {
  if (!process.env.SENTRY_DSN?.trim()) {
    return;
  }

  if (!Sentry.isInitialized()) {
    initObservability();
  }

  const err = error instanceof Error ? error : new Error(String(error));

  Sentry.withScope((scope) => {
    if (metadata) {
      for (const [key, value] of Object.entries(metadata)) {
        if (value !== undefined) {
          scope.setExtra(key, value);
        }
      }
    }
    Sentry.captureException(err);
  });
}

export async function flushObservability(): Promise<void> {
  if (Sentry.isInitialized()) {
    await Sentry.flush(2000);
  }
}
