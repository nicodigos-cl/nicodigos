/**
 * Runs all local cron pollers (used by `bun run dev`).
 *
 * Env: see individual scripts / .env.example
 * Flags: --once  run every job once and exit
 */
import { envInt, runCronPoller } from "./dev-cron-poll";

const ONCE = process.argv.includes("--once");

const JOBS = [
  {
    name: "cron-publish-outbox",
    path: "/api/cron/publish-outbox",
    intervalMs: envInt("CRON_PUBLISH_OUTBOX_INTERVAL_MS", 5_000),
    initialDelayMs: envInt("CRON_PUBLISH_OUTBOX_INITIAL_DELAY_MS", 3_000),
  },
  {
    name: "cron-sync-smm",
    path: "/api/cron/sync-smm-services",
    intervalMs: envInt("CRON_SYNC_SMM_INTERVAL_MS", 300_000),
    initialDelayMs: envInt("CRON_SYNC_SMM_INITIAL_DELAY_MS", 8_000),
  },
  {
    name: "cron-sync-kinguin",
    path: "/api/cron/sync-kinguin-products",
    intervalMs: envInt("CRON_SYNC_KINGUIN_INTERVAL_MS", 600_000),
    initialDelayMs: envInt("CRON_SYNC_KINGUIN_INITIAL_DELAY_MS", 20_000),
  },
  {
    name: "cron-cleanup-price-events",
    path: "/api/cron/cleanup-price-change-events",
    intervalMs: envInt("CRON_CLEANUP_PRICE_EVENTS_INTERVAL_MS", 86_400_000),
    initialDelayMs: envInt("CRON_CLEANUP_PRICE_EVENTS_INITIAL_DELAY_MS", 15_000),
  },
  {
    name: "cron-refresh-provider-balances",
    path: "/api/cron/refresh-provider-balances",
    intervalMs: envInt("CRON_REFRESH_PROVIDER_BALANCES_INTERVAL_MS", 300_000),
    initialDelayMs: envInt(
      "CRON_REFRESH_PROVIDER_BALANCES_INITIAL_DELAY_MS",
      12_000,
    ),
  },
] as const;

async function main() {
  await Promise.all(
    JOBS.map((job) =>
      runCronPoller({
        ...job,
        once: ONCE,
      }),
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
