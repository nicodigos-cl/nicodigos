/**
 * Desarrollo local: Next.js + túnel cloudflared + sync catálogo Kinguin (cada 15 min).
 *
 *   bun run dev
 *   DEV_CATALOG_SYNC=0 bun run dev   # sin sync
 */

import "dotenv/config";

import concurrently from "concurrently";
import { ensureDevPortFree } from "./ensure-dev-port";
import { FLOW_TUNNEL_LIMITED_MESSAGE } from "./tunnel-messages";

const port = process.env.PORT?.trim() || "3000";

function logFlowUrls() {
  const publicUrl = process.env.FLOW_PUBLIC_URL?.trim().replace(/\/$/, "");
  const returnUrl =
    process.env.FLOW_RETURN_URL?.trim().replace(/\/$/, "") ||
    process.env.BETTER_AUTH_URL?.trim().replace(/\/$/, "") ||
    `http://localhost:${port}`;

  if (publicUrl) {
    console.log(`[dev] FLOW_PUBLIC_URL=${publicUrl} (webhook Flow)`);
    console.log(`[dev] Webhook Flow: ${publicUrl}/api/webhooks/flow`);
    console.log(`[dev] Webhook Kinguin: ${publicUrl}/api/webhooks/kinguin`);
  } else {
    console.warn("[dev] FLOW_PUBLIC_URL no definida.");
    console.warn(FLOW_TUNNEL_LIMITED_MESSAGE);
  }

  console.log(`[dev] Retorno Flow: ${returnUrl}/api/checkout/flow-return`);
}

async function main() {
  await ensureDevPortFree(Number(port));

  logFlowUrls();
  console.log(`[dev] Next.js en http://localhost:${port}`);
  console.log("");

  const catalogSyncDisabled =
    process.env.DEV_CATALOG_SYNC?.trim() === "0" ||
    process.env.DEV_CATALOG_SYNC?.trim().toLowerCase() === "false";

  const sharedEnv = { ...process.env, PORT: port };

  const processes: Parameters<typeof concurrently>[0] = [
    {
      command: `next dev -p ${port}`,
      name: "next",
      prefixColor: "green",
      env: sharedEnv,
    },
    {
      command: "bun --env-file=.env run scripts/run-named-tunnel.ts",
      name: "tunnel",
      prefixColor: "cyan",
      env: sharedEnv,
    },
  ];

  if (!catalogSyncDisabled) {
    console.log(
      "[dev] Catálogo Kinguin: sync cada 15 min (proceso catalog-sync). Desactiva con DEV_CATALOG_SYNC=0",
    );
    processes.push({
      command: "bun --env-file=.env run scripts/sync-catalog-scheduler.ts",
      name: "catalog-sync",
      prefixColor: "yellow",
      env: sharedEnv,
    });
  } else {
    console.log("[dev] Sync catálogo desactivado (DEV_CATALOG_SYNC=0).");
  }

  const { result } = concurrently(processes, {
    prefix: "{name}",
    killOthersOn: ["failure"],
    restartTries: 100,
    restartDelay: 5_000,
  });

  await result;
}

if ((import.meta as any).main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
