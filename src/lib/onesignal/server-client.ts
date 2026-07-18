import "server-only";

import * as OneSignal from "@onesignal/node-onesignal";

import { createLogger } from "@/lib/logger";
import { safeError } from "@/lib/communications/security";
import type { AudienceDefinition, WebPushData } from "@/lib/validations/communications";

const log = createLogger({ module: "onesignal-client" });
let client: OneSignal.DefaultApi | null = null;

function config() {
  const appId = process.env.ONESIGNAL_APP_ID?.trim();
  const restApiKey = process.env.ONESIGNAL_REST_API_KEY?.trim();
  if (!appId || !restApiKey) throw new Error("ONESIGNAL_NOT_CONFIGURED");
  return { appId, restApiKey };
}

export function isOneSignalConfigured(): boolean {
  return Boolean(process.env.ONESIGNAL_APP_ID?.trim() && process.env.ONESIGNAL_REST_API_KEY?.trim());
}

function api(): { appId: string; client: OneSignal.DefaultApi } {
  const { appId, restApiKey } = config();
  client ??= new OneSignal.DefaultApi(OneSignal.createConfiguration({ restApiKey }));
  return { appId, client };
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs = 20_000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error("ONESIGNAL_TIMEOUT")), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function createOneSignalNotification(input: {
  title: string;
  body: string;
  targetUrl?: string | null;
  iconUrl?: string | null;
  imageUrl?: string | null;
  buttons: Array<{ id: string; text: string; url: string }>;
  data: WebPushData;
  audience: AudienceDefinition;
  resolvedUserIds?: string[];
  idempotencyKey: string;
  ttlSeconds?: number | null;
  priority: number;
}) {
  const { appId, client: oneSignal } = api();
  const notification = new OneSignal.Notification();
  notification.app_id = appId;
  notification.idempotency_key = input.idempotencyKey;
  notification.target_channel = "push";
  notification.headings = { en: input.title, es: input.title };
  notification.contents = { en: input.body, es: input.body };
  notification.web_url = input.targetUrl ?? undefined;
  notification.chrome_web_icon = input.iconUrl ?? undefined;
  notification.chrome_web_image = input.imageUrl ?? undefined;
  notification.web_buttons = input.buttons.map((button) => ({ id: button.id, text: button.text, url: button.url }));
  notification.data = input.data;
  notification.ttl = input.ttlSeconds ?? undefined;
  notification.priority = input.priority >= 8 ? 10 : 5;

  if (input.audience.type === "ONESIGNAL_SEGMENT") {
    notification.included_segments = [input.audience.segment];
  } else {
    if (!input.resolvedUserIds?.length) throw new Error("EMPTY_AUDIENCE");
    notification.include_aliases = { external_id: input.resolvedUserIds };
  }

  const startedAt = Date.now();
  try {
    const result = await withTimeout(oneSignal.createNotificationWithRetry(notification, { maxRetries: 2, baseDelayMs: 500 }));
    if (!result.response.id) throw new Error("ONESIGNAL_EMPTY_RESPONSE");
    log.info({ operation: "create_notification", provider: "ONESIGNAL", durationMs: Date.now() - startedAt, result: "accepted", externalId: `…${result.response.id.slice(-8)}`, replayed: result.wasReplayed }, "Push accepted by OneSignal");
    return result.response;
  } catch (error) {
    log.error({ operation: "create_notification", provider: "ONESIGNAL", durationMs: Date.now() - startedAt, errorCode: safeError(error) }, "Push send failed");
    throw error;
  }
}

export async function cancelOneSignalNotification(externalId: string) {
  const { appId, client: oneSignal } = api();
  return withTimeout(oneSignal.cancelNotification(appId, externalId));
}

export async function getOneSignalNotification(externalId: string) {
  const { appId, client: oneSignal } = api();
  return withTimeout(oneSignal.getNotification(appId, externalId));
}
