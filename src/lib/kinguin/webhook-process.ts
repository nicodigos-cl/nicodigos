import "server-only";

import {
  handleKinguinOrderStatusWebhook,
  handleKinguinProductUpdateWebhook,
} from "@/lib/kinguin/webhook-handlers";
import {
  parseKinguinOrderStatusPayload,
  parseKinguinProductUpdatePayload,
  type KinguinWebhookEventName,
} from "@/lib/kinguin/webhook";
import { createLogger } from "@/lib/logger";

const log = createLogger({ module: "kinguin-webhook" });

export async function processKinguinWebhookEvent(
  event: KinguinWebhookEventName,
  body: unknown,
): Promise<void> {
  if (event === "order.status" || event === "order.complete") {
    const payload = parseKinguinOrderStatusPayload(body, event);
    if (!payload) {
      log.warn({ event }, "Invalid Kinguin order webhook payload");
      return;
    }
    await handleKinguinOrderStatusWebhook(payload);
    return;
  }

  const payload = parseKinguinProductUpdatePayload(body);
  if (!payload) {
    log.warn({ event }, "Invalid Kinguin product.update payload");
    return;
  }
  await handleKinguinProductUpdateWebhook(payload);
}
