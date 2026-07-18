import { NextResponse } from "next/server";
import { processDueCommunications, syncOneSignalMetrics } from "@/lib/communications/web-push-jobs";
import { createLogger } from "@/lib/logger";

const log = createLogger({ module: "communication-jobs" });
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}` || request.headers.get("x-vercel-cron-secret") === secret;
}
async function handle(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const startedAt = Date.now();
  try {
    const [jobs, metrics] = await Promise.all([processDueCommunications(), syncOneSignalMetrics()]);
    log.info({ operation: "process_communications", jobs, metrics, durationMs: Date.now() - startedAt }, "Communication cron completed");
    return NextResponse.json({ ok: true, jobs, metrics, durationMs: Date.now() - startedAt });
  } catch (error) {
    log.error({ err: error, durationMs: Date.now() - startedAt }, "Communication cron failed");
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
export async function GET(request: Request) { return handle(request); }
export async function POST(request: Request) { return handle(request); }
