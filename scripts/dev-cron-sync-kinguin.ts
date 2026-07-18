/**
 * Dev helper: polls the Kinguin products sync cron on an interval.
 *
 * Env:
 *   CRON_SECRET (required)
 *   CRON_BASE_URL (default http://localhost:3000)
 *   CRON_SYNC_KINGUIN_INTERVAL_MS (default 600000 = 10 min)
 *   CRON_SYNC_KINGUIN_INITIAL_DELAY_MS (default 20000)
 *
 * Flags:
 *   --once  run a single sync and exit
 */
import { envInt, runCronPoller } from "./dev-cron-poll";

const ONCE = process.argv.includes("--once");

runCronPoller({
  name: "cron-sync-kinguin",
  path: "/api/cron/sync-kinguin-products",
  intervalMs: envInt("CRON_SYNC_KINGUIN_INTERVAL_MS", 600_000),
  initialDelayMs: envInt("CRON_SYNC_KINGUIN_INITIAL_DELAY_MS", 20_000),
  once: ONCE,
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
