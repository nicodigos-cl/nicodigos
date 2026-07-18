import { NextResponse } from "next/server";

import { syncAllKinguinProducts } from "@/lib/kinguin/sync";
import { createLogger } from "@/lib/logger";

const log = createLogger({ module: "cron-sync-kinguin-products" });

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return false;
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) {
    return true;
  }

  const cronHeader = request.headers.get("x-vercel-cron-secret");
  if (cronHeader && cronHeader === secret) {
    return true;
  }

  return false;
}

async function handleSync(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  log.info("starting Kinguin products sync cron");

  try {
    const result = await syncAllKinguinProducts();
    const durationMs = Date.now() - startedAt;

    log.info(
      {
        products: result.products,
        totals: result.totals,
        durationMs,
      },
      "Kinguin products sync cron finished",
    );

    return NextResponse.json({
      ok: true,
      durationMs,
      ...result,
    });
  } catch (error) {
    log.error({ err: error }, "Kinguin products sync cron failed");
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Error desconocido al sincronizar Kinguin",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return handleSync(request);
}

export async function POST(request: Request) {
  return handleSync(request);
}
