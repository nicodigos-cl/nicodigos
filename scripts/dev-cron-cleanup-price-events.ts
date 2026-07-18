/**
 * Dev helper: polls the price-change events cleanup cron on an interval.
 *
 * Env:
 *   CRON_SECRET (required)
 *   CRON_BASE_URL (default http://localhost:3000)
 *   CRON_CLEANUP_PRICE_EVENTS_INTERVAL_MS (default 86400000 = 24 h)
 *   CRON_CLEANUP_PRICE_EVENTS_INITIAL_DELAY_MS (default 15000)
 *
 * Flags:
 *   --once  run a single cleanup and exit
 *
 * Note: sync-smm also runs cleanup after each sync; this hits the dedicated
 * endpoint for independent scheduling / testing.
 */
import { envInt, runCronPoller } from "./dev-cron-poll";

const ONCE = process.argv.includes("--once");

runCronPoller({
  name: "cron-cleanup-price-events",
  path: "/api/cron/cleanup-price-change-events",
  intervalMs: envInt("CRON_CLEANUP_PRICE_EVENTS_INTERVAL_MS", 86_400_000),
  initialDelayMs: envInt("CRON_CLEANUP_PRICE_EVENTS_INITIAL_DELAY_MS", 15_000),
  once: ONCE,
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
