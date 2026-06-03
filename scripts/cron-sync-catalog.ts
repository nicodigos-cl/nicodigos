/**
 * Dispara el cron de sincronización Kinguin en la app desplegada.
 *
 *   bun run scripts/cron-sync-catalog.ts
 *   bun --env-file=.env run scripts/cron-sync-catalog.ts
 */

const secret = process.env.CRON_SECRET?.trim();
if (!secret) {
  console.error("[cron-sync] Falta CRON_SECRET");
  process.exit(1);
}

const target =
  process.env.CRON_SYNC_URL?.trim() ??
  (process.env.BETTER_AUTH_URL?.trim()
    ? `${process.env.BETTER_AUTH_URL.replace(/\/$/, "")}/api/cron/sync-catalog`
    : null);

if (!target) {
  console.error("[cron-sync] Falta CRON_SYNC_URL o BETTER_AUTH_URL");
  process.exit(1);
}

const batch = process.env.CRON_SYNC_BATCH_SIZE?.trim();
const url = batch ? `${target}?batch=${encodeURIComponent(batch)}` : target;

console.log(`[cron-sync] POST ${url}`);

const response = await fetch(url, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${secret}`,
    Accept: "application/json",
  },
});

const body = await response.text();
console.log(`[cron-sync] ${response.status}`, body);

if (!response.ok) {
  process.exit(1);
}
