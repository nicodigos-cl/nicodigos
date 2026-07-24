import { timingSafeEqual } from "node:crypto";

import {
  kinguinWebhookEventNameSchema,
  kinguinWebhookOrderStatusSchema,
  kinguinWebhookProductUpdateSchema,
  type KinguinWebhookEventName,
  type KinguinWebhookOrderStatusInput,
  type KinguinWebhookProductUpdateInput,
} from "@/lib/validations/kinguin-webhooks";

export type {
  KinguinWebhookEventName,
  KinguinWebhookOrderStatusInput,
  KinguinWebhookProductUpdateInput,
};

export function getKinguinWebhookSecret(): string | null {
  const secret = process.env.KINGUIN_WEBHOOK_SECRET?.trim();
  if (!secret) return null;
  return secret.replace(/^["']|["']$/g, "");
}

function secretsEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/** Validates `X-Event-Secret` against `KINGUIN_WEBHOOK_SECRET`. */
export function verifyKinguinWebhookRequest(request: Request): boolean {
  const secret = getKinguinWebhookSecret();
  if (!secret) return false;
  const header = request.headers.get("x-event-secret")?.trim() ?? "";
  if (!header) return false;
  return secretsEqual(header, secret);
}

/**
 * Normalize `X-Event-Name`.
 * Empty header → `probe` (Kinguin dashboard "TEST URL" often omits it).
 */
export function normalizeKinguinWebhookEventName(
  header: string | null,
): KinguinWebhookEventName | "probe" | null {
  const name = header?.trim().toLowerCase() ?? "";
  if (!name) return "probe";
  const parsed = kinguinWebhookEventNameSchema.safeParse(name);
  return parsed.success ? parsed.data : null;
}

export function parseKinguinWebhookBody(raw: string): unknown | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return null;
  }
}

export function parseKinguinOrderStatusPayload(
  body: unknown,
  event: Extract<KinguinWebhookEventName, "order.status" | "order.complete">,
): KinguinWebhookOrderStatusInput | null {
  const parsed = kinguinWebhookOrderStatusSchema.safeParse(body);
  if (!parsed.success) return null;

  if (event === "order.complete") {
    return {
      ...parsed.data,
      status: parsed.data.status?.trim() || "completed",
    };
  }

  if (!parsed.data.status?.trim()) return null;
  return parsed.data;
}

export function parseKinguinProductUpdatePayload(
  body: unknown,
): KinguinWebhookProductUpdateInput | null {
  const parsed = kinguinWebhookProductUpdateSchema.safeParse(body);
  return parsed.success ? parsed.data : null;
}
