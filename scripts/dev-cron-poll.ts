/**
 * Shared helpers for local cron pollers that hit Next.js cron routes.
 */
import "dotenv/config";

export type CronPollerOptions = {
  name: string;
  path: string;
  intervalMs: number;
  initialDelayMs: number;
  once: boolean;
};

export function envInt(name: string, fallback: number): number {
  const parsed = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function cronBaseUrl(): string {
  return (process.env.CRON_BASE_URL?.trim() || "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}

export function cronSecret(): string {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    throw new Error("CRON_SECRET is not set in the environment");
  }
  return secret;
}

export function createCronLogger(name: string) {
  return (message: string, extra?: unknown) => {
    const stamp = new Date().toISOString();
    if (extra !== undefined) {
      console.log(`[${name} ${stamp}] ${message}`, extra);
      return;
    }
    console.log(`[${name} ${stamp}] ${message}`);
  };
}

export async function waitForServer(
  baseUrl: string,
  log: (message: string, extra?: unknown) => void,
  timeoutMs = 120_000,
): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(baseUrl, { method: "GET" });
      if (response.status > 0) {
        return;
      }
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  throw new Error(`Server not reachable at ${baseUrl} after ${timeoutMs}ms`);
}

export async function invokeCron(
  endpoint: string,
  secret: string,
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      Accept: "application/json",
    },
  });

  const body = (await response.json().catch(() => null)) as unknown;
  return { ok: response.ok, status: response.status, body };
}

/** Wait for Next, then hit a cron route once or on an interval. */
export async function runCronPoller(options: CronPollerOptions): Promise<void> {
  const baseUrl = cronBaseUrl();
  const secret = cronSecret();
  const endpoint = `${baseUrl}${options.path}`;
  const log = createCronLogger(options.name);

  log(`endpoint ${endpoint}`);
  log(
    options.once
      ? "mode: once"
      : `mode: loop every ${options.intervalMs}ms (initial delay ${options.initialDelayMs}ms)`,
  );

  await waitForServer(baseUrl, log);
  log("server is up");

  if (!options.once) {
    await new Promise((resolve) =>
      setTimeout(resolve, options.initialDelayMs),
    );
  }

  const run = async () => {
    const result = await invokeCron(endpoint, secret);
    if (!result.ok) {
      log(`failed (${result.status})`, result.body);
      return;
    }
    log("ok", result.body);
  };

  await run();

  if (options.once) {
    return;
  }

  setInterval(() => {
    void run().catch((error) => {
      log("error", error instanceof Error ? error.message : error);
    });
  }, options.intervalMs);
}
