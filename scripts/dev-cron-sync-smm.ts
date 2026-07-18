/**
 * Dev helper: polls the SMM sync cron endpoint on an interval.
 *
 * Env:
 *   CRON_SECRET (required)
 *   CRON_BASE_URL (default http://localhost:3000)
 *   CRON_SYNC_SMM_INTERVAL_MS (default 300000 = 5 min)
 *   CRON_SYNC_SMM_INITIAL_DELAY_MS (default 8000)
 *
 * Flags:
 *   --once  run a single sync and exit
 */
import { envInt, runCronPoller } from "./dev-cron-poll";

const ONCE = process.argv.includes("--once");

runCronPoller({
  name: "cron-sync-smm",
  path: "/api/cron/sync-smm-services",
  intervalMs: envInt("CRON_SYNC_SMM_INTERVAL_MS", 300_000),
  initialDelayMs: envInt("CRON_SYNC_SMM_INITIAL_DELAY_MS", 8_000),
  once: ONCE,
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
