/**
 * Túnel nombrado de Cloudflare (~/.cloudflared/config.yml).
 * Si cloudflared no está, se queda vivo para no tumbar Next.js.
 */

import { spawn, execSync } from "node:child_process";
import { FLOW_TUNNEL_LIMITED_MESSAGE } from "./tunnel-messages";

const tunnelName =
  process.env.CLOUDFLARE_TUNNEL_NAME?.trim() || "soyupwork-local";

function hasCloudflared(): boolean {
  try {
    execSync("which cloudflared", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function idleForever() {
  return new Promise<void>(() => {});
}

async function main() {
  if (!hasCloudflared()) {
    console.warn(
      "[tunnel] cloudflared no está instalado o no está en el PATH.",
    );
    console.warn(FLOW_TUNNEL_LIMITED_MESSAGE);
    console.warn("[tunnel] Next.js seguirá sin túnel público.");
    await idleForever();
    return;
  }

  console.log(`[tunnel] cloudflared tunnel run ${tunnelName}`);

  const proc = spawn("cloudflared", ["tunnel", "run", tunnelName], {
    stdio: "inherit",
  });

  proc.on("error", async () => {
    console.warn("[tunnel] No se pudo ejecutar cloudflared.");
    console.warn(FLOW_TUNNEL_LIMITED_MESSAGE);
    await idleForever();
  });

  proc.on("exit", (code) => {
    process.exit(code ?? 0);
  });
}

if (import.meta.main) {
  main();
}
