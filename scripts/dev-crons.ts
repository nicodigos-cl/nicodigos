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
    name: "cron-sync-smm",
    path: "/api/cron/sync-smm-services",
    intervalMs: envInt("CRON_SYNC_SMM_INTERVAL_MS", 300_000),
    initialDelayMs: envInt("CRON_SYNC_SMM_INITIAL_DELAY_MS", 8_000),
  },
  {
    name: "cron-cleanup-price-events",
    path: "/api/cron/cleanup-price-change-events",
    intervalMs: envInt("CRON_CLEANUP_PRICE_EVENTS_INTERVAL_MS", 86_400_000),
    initialDelayMs: envInt("CRON_CLEANUP_PRICE_EVENTS_INITIAL_DELAY_MS", 15_000),
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
