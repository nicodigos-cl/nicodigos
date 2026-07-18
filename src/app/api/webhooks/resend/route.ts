import { NextResponse } from "next/server";
import { z } from "zod";

import { processResendWebhook } from "@/lib/communications/resend-webhooks";
import { safeError } from "@/lib/communications/security";
import { verifyResendWebhook } from "@/lib/email/resend-client";
import { createLogger } from "@/lib/logger";

const log = createLogger({ module: "resend-webhook" });
const eventSchema = z.object({ type: z.string().min(1).max(80), created_at: z.string().datetime(), data: z.object({ email_id: z.string().optional(), from: z.string().optional(), to: z.array(z.string()).optional(), subject: z.string().optional(), message_id: z.string().optional() }).passthrough() });

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const payload = await request.text();
  let verified: unknown;
  try { verified = verifyResendWebhook(payload, request.headers); } catch (error) {
    log.warn({ errorCode: safeError(error) }, "Rejected invalid Resend webhook");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  const parsed = eventSchema.safeParse(verified);
  if (!parsed.success) return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  const eventId = request.headers.get("svix-id");
  if (!eventId) return NextResponse.json({ error: "Missing event id" }, { status: 400 });
  try {
    const result = await processResendWebhook(eventId, parsed.data);
    return NextResponse.json({ ok: true, duplicate: result.duplicate });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
