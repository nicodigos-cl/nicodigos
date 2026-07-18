"use server";

import { revalidatePath } from "next/cache";
import { flattenError } from "zod";
import type { Prisma } from "@/generated/prisma/client";

import type { ActionResult } from "@/lib/actions/types";
import { requireAdminSession } from "@/lib/auth/session";
import { recordCommunicationAudit } from "@/lib/communications/audit";
import { resolvePushAudience } from "@/lib/communications/audience";
import { enforceCommunicationRateLimit } from "@/lib/communications/rate-limit";
import { safeError } from "@/lib/communications/security";
import { canTransitionWebPush } from "@/lib/communications/status";
import { cancelOneSignalNotification } from "@/lib/onesignal/server-client";
import prisma from "@/lib/prisma";
import { pushIdSchema, schedulePushSchema, sendPushNowSchema, webPushDraftSchema } from "@/lib/validations/communications";

function parse(input: unknown): unknown {
  if (!(input instanceof FormData)) return input;
  const payload = input.get("payload");
  try { return typeof payload === "string" ? JSON.parse(payload) as unknown : null; } catch { return null; }
}
function invalid<T>(error: Parameters<typeof flattenError>[0]): ActionResult<T> {
  const flat = flattenError(error); return { success: false, message: "Revisa los datos del formulario.", fieldErrors: flat.fieldErrors };
}
async function actor() { const session = await requireAdminSession(); return { userId: session.user.id, email: session.user.email }; }
function refresh(id?: string) { revalidatePath("/admin/communications"); revalidatePath("/admin/communications/web-push"); if (id) revalidatePath(`/admin/communications/web-push/${id}`); }

export async function createWebPushDraftAction(rawInput: unknown): Promise<ActionResult<{ id: string }>> {
  const admin = await actor();
  const parsed = webPushDraftSchema.safeParse(parse(rawInput));
  if (!parsed.success) return invalid(parsed.error);
  const input = parsed.data;
  const audienceType = input.audience.type;
  const result = await prisma.$transaction(async (tx) => {
    let notification;
    if (input.notificationId) {
      const current = await tx.webPushNotification.findFirst({ where: { id: input.notificationId, status: "DRAFT", deletedAt: null }, select: { id: true } });
      if (!current) throw new Error("NOT_EDITABLE");
      notification = await tx.webPushNotification.update({ where: { id: current.id }, data: { name: input.name, title: input.title, body: input.body, kind: input.kind, targetUrl: input.targetUrl || null, iconUrl: input.iconUrl || null, imageUrl: input.imageUrl || null, buttons: input.buttons, data: input.data, language: input.language, priority: input.priority, ttlSeconds: input.ttlSeconds, audienceType, audienceDefinition: input.audience, updatedByUserId: admin.userId, updatedByEmail: admin.email } });
    } else {
      const existing = await tx.webPushNotification.findUnique({ where: { idempotencyKey: input.idempotencyKey }, select: { id: true } });
      if (existing) return existing;
      notification = await tx.webPushNotification.create({ data: { name: input.name, title: input.title, body: input.body, kind: input.kind, targetUrl: input.targetUrl || null, iconUrl: input.iconUrl || null, imageUrl: input.imageUrl || null, buttons: input.buttons, data: input.data, language: input.language, priority: input.priority, ttlSeconds: input.ttlSeconds, audienceType, audienceDefinition: input.audience, idempotencyKey: input.idempotencyKey, createdByUserId: admin.userId, createdByEmail: admin.email } });
    }
    await recordCommunicationAudit({ actor: admin, action: "PUSH_DRAFT_SAVE", channel: "WEB_PUSH", resourceType: "WEB_PUSH", resourceId: notification.id, statusAfter: "DRAFT", audienceSummary: { type: audienceType } }, tx);
    return notification;
  }).catch((error: unknown) => ({ error: safeError(error) }));
  if ("error" in result) return { success: false, message: result.error === "NOT_EDITABLE" ? "Solo se pueden editar borradores." : "No se pudo guardar el borrador." };
  refresh(result.id); return { success: true, data: { id: result.id } };
}

export async function updateWebPushDraftAction(input: unknown) { return createWebPushDraftAction(input); }

export async function estimateWebPushAudienceAction(rawInput: unknown): Promise<ActionResult<{ estimated: number; excluded: number; warnings: string[]; resolvedAt: string }>> {
  const admin = await actor();
  const parsed = webPushDraftSchema.pick({ audience: true, kind: true }).safeParse(parse(rawInput));
  if (!parsed.success) return invalid(parsed.error);
  try {
    await enforceCommunicationRateLimit(admin.userId, "AUDIENCE_ESTIMATE");
    const resolution = await resolvePushAudience(parsed.data.audience, parsed.data.kind);
    await recordCommunicationAudit({ actor: admin, action: "AUDIENCE_ESTIMATE", channel: "WEB_PUSH", resourceType: "AUDIENCE", resourceId: "adhoc", estimatedRecipients: resolution.estimated, audienceSummary: { type: parsed.data.audience.type } });
    return { success: true, data: { estimated: resolution.estimated, excluded: resolution.excluded, warnings: resolution.warnings, resolvedAt: resolution.resolvedAt } };
  } catch (error) {
    return { success: false, message: safeError(error) === "RATE_LIMITED" ? "Demasiadas estimaciones. Espera unos minutos." : "No se pudo resolver la audiencia." };
  }
}

export async function scheduleWebPushAction(rawInput: unknown): Promise<ActionResult<{ id: string; scheduledAt: string }>> {
  const admin = await actor(); const parsed = schedulePushSchema.safeParse(parse(rawInput)); if (!parsed.success) return invalid(parsed.error);
  const current = await prisma.webPushNotification.findFirst({ where: { id: parsed.data.notificationId, status: "DRAFT", deletedAt: null }, select: { id: true, status: true, audienceDefinition: true, kind: true } });
  if (!current || !canTransitionWebPush(current.status, "SCHEDULED")) return { success: false, message: "La notificación ya no se puede programar." };
  const audience = (await import("@/lib/validations/communications")).audienceDefinitionSchema.safeParse(current.audienceDefinition);
  if (!audience.success) return { success: false, message: "La audiencia guardada no es válida." };
  const resolution = await resolvePushAudience(audience.data, current.kind as "OPERATIONAL" | "MARKETING" | "SECURITY");
  if (audience.data.type !== "ONESIGNAL_SEGMENT" && resolution.estimated === 0) return { success: false, message: "La audiencia elegible está vacía." };
  await prisma.$transaction(async (tx) => {
    await tx.webPushNotification.update({ where: { id: current.id }, data: { status: "SCHEDULED", scheduledAt: parsed.data.scheduledAt, idempotencyKey: parsed.data.idempotencyKey, estimatedRecipients: resolution.estimated, excludedRecipients: resolution.excluded, updatedByUserId: admin.userId, updatedByEmail: admin.email } });
    await recordCommunicationAudit({ actor: admin, action: "PUSH_SCHEDULE", channel: "WEB_PUSH", resourceType: "WEB_PUSH", resourceId: current.id, statusBefore: "DRAFT", statusAfter: "SCHEDULED", estimatedRecipients: resolution.estimated, audienceSummary: { type: audience.data.type } }, tx);
  });
  refresh(current.id); return { success: true, data: { id: current.id, scheduledAt: parsed.data.scheduledAt.toISOString() } };
}

export async function sendWebPushNowAction(rawInput: unknown): Promise<ActionResult<{ id: string; status: "QUEUED" }>> {
  const admin = await actor(); const parsed = sendPushNowSchema.safeParse(parse(rawInput)); if (!parsed.success) return invalid(parsed.error);
  try { await enforceCommunicationRateLimit(admin.userId, "PUSH_SEND"); } catch { return { success: false, message: "Límite de envíos alcanzado. Intenta más tarde." }; }
  const current = await prisma.webPushNotification.findFirst({ where: { id: parsed.data.notificationId, status: { in: ["DRAFT", "FAILED"] }, deletedAt: null }, select: { id: true, status: true, audienceDefinition: true, kind: true } });
  if (!current || !canTransitionWebPush(current.status, "QUEUED")) return { success: false, message: "La notificación ya no se puede enviar." };
  const audience = (await import("@/lib/validations/communications")).audienceDefinitionSchema.safeParse(current.audienceDefinition);
  if (!audience.success) return { success: false, message: "La audiencia guardada no es válida." };
  const resolution = await resolvePushAudience(audience.data, current.kind as "OPERATIONAL" | "MARKETING" | "SECURITY");
  if (audience.data.type !== "ONESIGNAL_SEGMENT" && resolution.estimated === 0) return { success: false, message: "La audiencia elegible está vacía." };
  await prisma.$transaction(async (tx) => {
    await tx.webPushNotification.update({ where: { id: current.id }, data: { status: "QUEUED", queuedAt: new Date(), scheduledAt: null, idempotencyKey: parsed.data.idempotencyKey, estimatedRecipients: resolution.estimated, excludedRecipients: resolution.excluded } });
    await recordCommunicationAudit({ actor: admin, action: "PUSH_SEND", channel: "WEB_PUSH", resourceType: "WEB_PUSH", resourceId: current.id, statusBefore: current.status, statusAfter: "QUEUED", estimatedRecipients: resolution.estimated, audienceSummary: { type: audience.data.type } }, tx);
  });
  refresh(current.id); return { success: true, data: { id: current.id, status: "QUEUED" } };
}

export async function cancelScheduledWebPushAction(rawInput: unknown): Promise<ActionResult<{ id: string; status: "CANCELLED" }>> {
  const admin = await actor(); const parsed = pushIdSchema.safeParse(parse(rawInput)); if (!parsed.success) return invalid(parsed.error);
  const current = await prisma.webPushNotification.findFirst({ where: { id: parsed.data.notificationId, deletedAt: null }, select: { id: true, status: true, externalId: true } });
  if (!current) return { success: false, message: "Notificación no encontrada." };
  if (current.status === "CANCELLED") return { success: true, data: { id: current.id, status: "CANCELLED" } };
  if (!canTransitionWebPush(current.status, "CANCELLED")) return { success: false, message: "El envío ya comenzó y no se puede cancelar." };
  if (current.externalId) {
    try { await cancelOneSignalNotification(current.externalId); } catch { return { success: false, message: "OneSignal no confirmó la cancelación. El estado local no fue modificado." }; }
  }
  await prisma.$transaction(async (tx) => {
    const updated = await tx.webPushNotification.updateMany({ where: { id: current.id, status: current.status }, data: { status: "CANCELLED", cancelledAt: new Date() } });
    if (updated.count !== 1) throw new Error("STATE_CHANGED");
    await recordCommunicationAudit({ actor: admin, action: "PUSH_CANCEL", channel: "WEB_PUSH", resourceType: "WEB_PUSH", resourceId: current.id, statusBefore: current.status, statusAfter: "CANCELLED", externalId: current.externalId }, tx);
  });
  refresh(current.id); return { success: true, data: { id: current.id, status: "CANCELLED" } };
}

export async function duplicateWebPushAction(rawInput: unknown): Promise<ActionResult<{ id: string }>> {
  const admin = await actor(); const parsed = pushIdSchema.safeParse(parse(rawInput)); if (!parsed.success) return invalid(parsed.error);
  const source = await prisma.webPushNotification.findFirst({ where: { id: parsed.data.notificationId, deletedAt: null } });
  if (!source) return { success: false, message: "Notificación no encontrada." };
  const copy = await prisma.$transaction(async (tx) => {
    const created = await tx.webPushNotification.create({ data: { name: `${source.name} (copia)`, title: source.title, body: source.body, kind: source.kind, targetUrl: source.targetUrl, iconUrl: source.iconUrl, imageUrl: source.imageUrl, buttons: (source.buttons ?? undefined) as Prisma.InputJsonValue | undefined, data: source.data as Prisma.InputJsonValue, language: source.language, timezone: source.timezone, priority: source.priority, ttlSeconds: source.ttlSeconds, audienceType: source.audienceType, audienceDefinition: source.audienceDefinition as Prisma.InputJsonValue, replacedNotificationId: source.id, createdByUserId: admin.userId, createdByEmail: admin.email } });
    await recordCommunicationAudit({ actor: admin, action: "PUSH_DUPLICATE", channel: "WEB_PUSH", resourceType: "WEB_PUSH", resourceId: created.id, statusAfter: "DRAFT", safeMetadata: { sourceId: source.id } }, tx); return created;
  });
  refresh(copy.id); return { success: true, data: { id: copy.id } };
}

export async function deleteWebPushDraftAction(rawInput: unknown): Promise<ActionResult<{ id: string }>> {
  const admin = await actor(); const parsed = pushIdSchema.safeParse(parse(rawInput)); if (!parsed.success) return invalid(parsed.error);
  const draft = await prisma.webPushNotification.findFirst({ where: { id: parsed.data.notificationId, status: "DRAFT", deletedAt: null }, select: { id: true } });
  if (!draft) return { success: false, message: "Solo se pueden eliminar borradores." };
  await prisma.$transaction(async (tx) => { await tx.webPushNotification.update({ where: { id: draft.id }, data: { deletedAt: new Date() } }); await recordCommunicationAudit({ actor: admin, action: "PUSH_DRAFT_DELETE", channel: "WEB_PUSH", resourceType: "WEB_PUSH", resourceId: draft.id, statusBefore: "DRAFT", statusAfter: "DRAFT" }, tx); });
  refresh(); return { success: true, data: { id: draft.id } };
}

export async function archiveWebPushAction(rawInput: unknown): Promise<ActionResult<{ id: string }>> {
  const admin = await actor(); const parsed = pushIdSchema.safeParse(parse(rawInput)); if (!parsed.success) return invalid(parsed.error);
  const current = await prisma.webPushNotification.findFirst({ where: { id: parsed.data.notificationId, status: { in: ["SENT", "PARTIALLY_SENT", "FAILED", "CANCELLED"] }, deletedAt: null }, select: { id: true, status: true } });
  if (!current || !canTransitionWebPush(current.status, "ARCHIVED")) return { success: false, message: "Esta notificación no se puede archivar." };
  await prisma.$transaction(async (tx) => { await tx.webPushNotification.update({ where: { id: current.id }, data: { status: "ARCHIVED", archivedAt: new Date() } }); await recordCommunicationAudit({ actor: admin, action: "PUSH_ARCHIVE", channel: "WEB_PUSH", resourceType: "WEB_PUSH", resourceId: current.id, statusBefore: current.status, statusAfter: "ARCHIVED" }, tx); });
  refresh(current.id); return { success: true, data: { id: current.id } };
}
