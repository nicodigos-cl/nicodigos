import { NextResponse } from "next/server";

import { createLogger } from "@/lib/logger";
import { publishDeliveryOutbox } from "@/lib/outbox/publisher";

const log = createLogger({ module: "cron-publish-outbox" });

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}` ||
    request.headers.get("x-vercel-cron-secret") === secret;
}

async function handle(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await publishDeliveryOutbox();
    log.info(result, "Outbox publisher cron finished");
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    log.error({ err: error }, "Outbox publisher cron failed");
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
