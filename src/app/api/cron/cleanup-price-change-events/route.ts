import { NextResponse } from "next/server";

import { cleanupExpiredPriceChangeEvents } from "@/lib/events/cleanup-price-change-events";
import { createLogger } from "@/lib/logger";

const log = createLogger({ module: "cron-cleanup-price-change-events" });

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

async function handleCleanup(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await cleanupExpiredPriceChangeEvents();
    log.info(result, "price change events cleanup cron finished");
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    log.error({ err: error }, "price change events cleanup cron failed");
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Error desconocido al limpiar eventos",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return handleCleanup(request);
}

export async function POST(request: Request) {
  return handleCleanup(request);
}
