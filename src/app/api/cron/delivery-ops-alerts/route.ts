import { NextResponse } from "next/server";

import { runDeliveryOpsAlerts } from "@/lib/deliveries/ops-alerts";
import { createLogger } from "@/lib/logger";

const log = createLogger({ module: "cron-delivery-ops-alerts" });

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return (
    request.headers.get("authorization") === `Bearer ${secret}` ||
    request.headers.get("x-vercel-cron-secret") === secret
  );
}

async function handle(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await runDeliveryOpsAlerts();
    log.info(result, "Delivery ops alerts cron finished");
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    log.error({ err: error }, "Delivery ops alerts cron failed");
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
