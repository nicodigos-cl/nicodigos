import { after, NextResponse } from "next/server";

import { processKinguinWebhookEvent } from "@/lib/kinguin/webhook-process";
import {
  getKinguinWebhookSecret,
  normalizeKinguinWebhookEventName,
  parseKinguinWebhookBody,
  verifyKinguinWebhookRequest,
  type KinguinWebhookEventName,
} from "@/lib/kinguin/webhook";
import { createLogger } from "@/lib/logger";

const log = createLogger({ module: "kinguin-webhook" });

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function empty(status: number): NextResponse {
  return new NextResponse(null, { status });
}

/**
 * Kinguin ESA webhooks (`Kinguin-eCommerce-API/features/Webhooks.md`).
 * Requires POST + any 2xx with empty body (prefer 204).
 * Dashboard "TEST URL" often sends only `X-Event-Secret` (no body / event name).
 */
export async function POST(request: Request) {
  if (!getKinguinWebhookSecret()) {
    log.warn("KINGUIN_WEBHOOK_SECRET is not configured");
    return empty(503);
  }

  if (!verifyKinguinWebhookRequest(request)) {
    return empty(401);
  }

  const normalized = normalizeKinguinWebhookEventName(
    request.headers.get("x-event-name"),
  );
  const body = parseKinguinWebhookBody(await request.text());

  if (normalized === "probe" || !body) {
    log.info("Kinguin webhook probe OK (test URL or empty body)");
    return empty(204);
  }

  if (!normalized) {
    log.warn(
      { eventName: request.headers.get("x-event-name") },
      "Unknown Kinguin webhook event; acknowledging 204",
    );
    return empty(204);
  }

  const event = normalized as KinguinWebhookEventName;

  after(async () => {
    try {
      await processKinguinWebhookEvent(event, body);
    } catch (error) {
      log.error({ err: error, event }, "Kinguin webhook processing failed");
    }
  });

  return empty(204);
}
