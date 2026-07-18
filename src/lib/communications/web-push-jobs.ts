import "server-only";

import { audienceDefinitionSchema, webPushDataSchema } from "@/lib/validations/communications";
import { recordCommunicationAudit } from "@/lib/communications/audit";
import { resolvePushAudience } from "@/lib/communications/audience";
import { safeError } from "@/lib/communications/security";
import { createOneSignalNotification, getOneSignalNotification } from "@/lib/onesignal/server-client";
import { createLogger } from "@/lib/logger";
import prisma from "@/lib/prisma";

const log = createLogger({ module: "communication-jobs" });

export async function processWebPushNotification(notificationId: string) {
  const claimed = await prisma.webPushNotification.updateMany({
    where: { id: notificationId, status: { in: ["QUEUED", "SCHEDULED"] }, deletedAt: null, OR: [{ scheduledAt: null }, { scheduledAt: { lte: new Date() } }] },
    data: { status: "SENDING", sendingAt: new Date(), providerError: null },
  });
  if (claimed.count !== 1) return { processed: false, reason: "not_claimable" } as const;
  const notification = await prisma.webPushNotification.findUniqueOrThrow({ where: { id: notificationId } });
  const audience = audienceDefinitionSchema.safeParse(notification.audienceDefinition);
  const data = webPushDataSchema.safeParse(notification.data);
  if (!audience.success || !data.success || !notification.idempotencyKey) {
    await prisma.webPushNotification.update({ where: { id: notification.id }, data: { status: "FAILED", providerError: "INVALID_STORED_PAYLOAD" } });
    return { processed: true, sent: false, reason: "invalid_payload" } as const;
  }
  try {
    const resolution = await resolvePushAudience(audience.data, notification.kind as "OPERATIONAL" | "MARKETING" | "SECURITY");
    if (audience.data.type !== "ONESIGNAL_SEGMENT" && resolution.estimated === 0) throw new Error("EMPTY_AUDIENCE");
    const buttons = Array.isArray(notification.buttons) ? notification.buttons : [];
    const parsedButtons = buttons.flatMap((button) => {
      if (!button || typeof button !== "object" || Array.isArray(button)) return [];
      const candidate = button as Record<string, unknown>;
      return typeof candidate.id === "string" && typeof candidate.text === "string" && typeof candidate.url === "string"
        ? [{ id: candidate.id, text: candidate.text, url: candidate.url }] : [];
    });
    const response = await createOneSignalNotification({
      title: notification.title, body: notification.body, targetUrl: notification.targetUrl,
      iconUrl: notification.iconUrl, imageUrl: notification.imageUrl, buttons: parsedButtons,
      data: data.data, audience: audience.data, resolvedUserIds: resolution.userIds,
      idempotencyKey: notification.idempotencyKey, ttlSeconds: notification.ttlSeconds, priority: notification.priority,
    });
    await prisma.$transaction(async (tx) => {
      await tx.webPushNotification.update({ where: { id: notification.id }, data: { status: "SENT", externalId: response.id, sentAt: new Date(), estimatedRecipients: resolution.estimated || notification.estimatedRecipients, excludedRecipients: resolution.excluded, recipients: resolution.estimated, successful: resolution.estimated, providerError: null, lastProviderSyncAt: new Date() } });
      await recordCommunicationAudit({ action: "PUSH_SEND_JOB", channel: "WEB_PUSH", resourceType: "WEB_PUSH", resourceId: notification.id, statusBefore: "SENDING", statusAfter: "SENT", estimatedRecipients: resolution.estimated, affectedRecipients: resolution.estimated, externalId: response.id, audienceSummary: { type: audience.data.type } }, tx);
    });
    log.info({ operation: "push_job", notificationId, provider: "ONESIGNAL", recipients: resolution.estimated, result: "sent" }, "Web push job completed");
    return { processed: true, sent: true } as const;
  } catch (error) {
    const errorCode = safeError(error);
    await prisma.$transaction(async (tx) => {
      await tx.webPushNotification.update({ where: { id: notification.id }, data: { status: "FAILED", providerError: errorCode } });
      await recordCommunicationAudit({ action: "PUSH_SEND_JOB", channel: "WEB_PUSH", resourceType: "WEB_PUSH", resourceId: notification.id, statusBefore: "SENDING", statusAfter: "FAILED", result: "FAILED", errorCode }, tx);
    });
    log.error({ operation: "push_job", notificationId, errorCode, result: "failed" }, "Web push job failed");
    return { processed: true, sent: false, reason: errorCode } as const;
  }
}

export async function processDueCommunications(limit = 20) {
  const due = await prisma.webPushNotification.findMany({ where: { status: { in: ["QUEUED", "SCHEDULED"] }, deletedAt: null, OR: [{ scheduledAt: null }, { scheduledAt: { lte: new Date() } }] }, orderBy: [{ scheduledAt: "asc" }, { createdAt: "asc" }], take: limit, select: { id: true } });
  const results = [];
  for (const item of due) results.push(await processWebPushNotification(item.id));
  return { found: due.length, processed: results.filter((result) => result.processed).length, sent: results.filter((result) => result.processed && "sent" in result && result.sent).length };
}

export async function syncOneSignalMetrics(limit = 50) {
  const rows = await prisma.webPushNotification.findMany({ where: { externalId: { not: null }, status: { in: ["SENT", "PARTIALLY_SENT", "FAILED"] }, sentAt: { gte: new Date(Date.now() - 30 * 86_400_000) } }, orderBy: { lastProviderSyncAt: "asc" }, take: limit, select: { id: true, externalId: true } });
  let synced = 0;
  for (const row of rows) {
    if (!row.externalId) continue;
    try {
      const remote = await getOneSignalNotification(row.externalId);
      await prisma.webPushNotification.update({ where: { id: row.id }, data: { recipients: remote.successful ?? 0, successful: remote.successful ?? 0, failed: (remote.failed ?? 0) + (remote.errored ?? 0), delivered: remote.received ?? 0, clicked: remote.converted ?? 0, lastProviderSyncAt: new Date(), status: (remote.failed ?? 0) > 0 && (remote.successful ?? 0) > 0 ? "PARTIALLY_SENT" : (remote.failed ?? 0) > 0 && (remote.successful ?? 0) === 0 ? "FAILED" : "SENT" } });
      synced += 1;
    } catch (error) {
      log.warn({ notificationId: row.id, errorCode: safeError(error) }, "Could not sync OneSignal metrics");
    }
  }
  return { found: rows.length, synced };
}
