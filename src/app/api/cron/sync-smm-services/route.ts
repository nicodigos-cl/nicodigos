import { NextResponse } from "next/server";

import { createLogger } from "@/lib/logger";
import { syncAllProvidersServices } from "@/lib/smm-providers/sync";

const log = createLogger({ module: "cron-sync-smm-services" });

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Allow long-running multi-provider syncs on platforms that honor this. */
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

  // Vercel Cron sends this header when CRON_SECRET is configured.
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
  log.info("starting SMM providers sync cron");

  try {
    const result = await syncAllProvidersServices();
    const durationMs = Date.now() - startedAt;

    log.info(
      {
        providers: result.providers,
        totals: result.totals,
        durationMs,
      },
      "SMM providers sync cron finished",
    );

    return NextResponse.json({
      ok: true,
      durationMs,
      ...result,
    });
  } catch (error) {
    log.error({ err: error }, "SMM providers sync cron failed");
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Error desconocido al sincronizar",
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
