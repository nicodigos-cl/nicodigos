/**
 * Desarrollo local: Next.js + túnel nombrado cloudflared (via concurrently).
 * Usa FLOW_PUBLIC_URL fija (p. ej. https://soyup.work) y CLOUDFLARE_TUNNEL_NAME.
 *
 *   bun run dev
 */

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
    console.log(`[dev] Webhook: ${publicUrl}/api/webhooks/flow`);
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

  const { result } = concurrently(
    [
      {
        command: `next dev -p ${port}`,
        name: "next",
        prefixColor: "green",
        env: {
          PORT: port,
        },
      },
      {
        command: "bun run scripts/run-named-tunnel.ts",
        name: "tunnel",
        prefixColor: "cyan",
      },
    ],
    {
      prefix: "{name}",
      killOthersOn: ["failure"],
    },
  );

  await result;
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
