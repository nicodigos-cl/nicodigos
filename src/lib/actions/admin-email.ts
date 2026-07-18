"use server";

import { revalidatePath } from "next/cache";
import { flattenError } from "zod";

import { AdminComposedEmail } from "@/emails/admin-composed-email";
import type { ActionResult } from "@/lib/actions/types";
import { requireAdminSession } from "@/lib/auth/session";
import { recordCommunicationAudit } from "@/lib/communications/audit";
import { enforceCommunicationRateLimit } from "@/lib/communications/rate-limit";
import { maskEmail, safeAdminHtmlFromText, safeError } from "@/lib/communications/security";
import { sendWithResend } from "@/lib/email/resend-client";
import { createLogger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { getCommunicationAttachmentUrl } from "@/lib/r2";
import {
  assignThreadSchema, createInternalNoteSchema, markThreadReadSchema,
  saveEmailDraftSchema, sendEmailSchema, threadIdSchema, updateThreadStatusSchema,
} from "@/lib/validations/communications";

const log = createLogger({ module: "admin-communications" });

function parseSubmission(input: unknown): unknown {
  if (!(input instanceof FormData)) return input;
  const payload = input.get("payload");
  if (typeof payload !== "string") return null;
  try { return JSON.parse(payload) as unknown; } catch { return null; }
}

function validationError<T>(error: Parameters<typeof flattenError>[0]): ActionResult<T> {
  const flat = flattenError(error);
  return { success: false, message: "Revisa los datos del formulario.", fieldErrors: flat.fieldErrors };
}

async function actor() {
  const session = await requireAdminSession();
  return { userId: session.user.id, email: session.user.email };
}

function revalidateCommunications(threadId?: string) {
  revalidatePath("/admin/communications");
  revalidatePath("/admin/communications/email");
  if (threadId) revalidatePath(`/admin/communications/email/${threadId}`);
}

export async function markThreadReadAction(rawInput: unknown): Promise<ActionResult<{ threadId: string }>> {
  const admin = await actor();
  const parsed = markThreadReadSchema.safeParse(parseSubmission(rawInput));
  if (!parsed.success) return validationError(parsed.error);
  const thread = await prisma.communicationThread.findFirst({ where: { id: parsed.data.threadId, deletedAt: null }, select: { id: true, unreadCount: true } });
  if (!thread) return { success: false, message: "Conversación no encontrada." };
  await prisma.$transaction(async (tx) => {
    await tx.communicationThread.update({ where: { id: thread.id }, data: { unreadCount: parsed.data.read ? 0 : Math.max(1, thread.unreadCount) } });
    await recordCommunicationAudit({ actor: admin, action: parsed.data.read ? "THREAD_MARK_READ" : "THREAD_MARK_UNREAD", channel: "EMAIL", resourceType: "THREAD", resourceId: thread.id }, tx);
  });
  revalidateCommunications(thread.id);
  return { success: true, data: { threadId: thread.id } };
}

export async function assignThreadAction(rawInput: unknown): Promise<ActionResult<{ threadId: string }>> {
  const admin = await actor();
  const parsed = assignThreadSchema.safeParse(parseSubmission(rawInput));
  if (!parsed.success) return validationError(parsed.error);
  const thread = await prisma.communicationThread.findFirst({ where: { id: parsed.data.threadId, deletedAt: null }, select: { id: true, assignedUserId: true } });
  if (!thread) return { success: false, message: "Conversación no encontrada." };
  const assignee = parsed.data.assignedUserId ? await prisma.user.findFirst({ where: { id: parsed.data.assignedUserId, role: "ADMIN", accountStatus: "ACTIVE" }, select: { id: true, email: true } }) : null;
  if (parsed.data.assignedUserId && !assignee) return { success: false, message: "Administrador no válido." };
  await prisma.$transaction(async (tx) => {
    await tx.communicationThread.update({ where: { id: thread.id }, data: { assignedUserId: assignee?.id ?? null, assignedEmail: assignee?.email ?? null } });
    await recordCommunicationAudit({ actor: admin, action: "THREAD_ASSIGN", channel: "EMAIL", resourceType: "THREAD", resourceId: thread.id, safeMetadata: { previousAssignee: thread.assignedUserId, assignee: assignee?.id ?? null } }, tx);
  });
  revalidateCommunications(thread.id);
  return { success: true, data: { threadId: thread.id } };
}

export async function updateThreadStatusAction(rawInput: unknown): Promise<ActionResult<{ threadId: string }>> {
  const admin = await actor();
  const parsed = updateThreadStatusSchema.safeParse(parseSubmission(rawInput));
  if (!parsed.success) return validationError(parsed.error);
  const thread = await prisma.communicationThread.findFirst({ where: { id: parsed.data.threadId, deletedAt: null }, select: { id: true, status: true } });
  if (!thread) return { success: false, message: "Conversación no encontrada." };
  if (thread.status === parsed.data.status) return { success: true, data: { threadId: thread.id } };
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.communicationThread.update({ where: { id: thread.id }, data: { status: parsed.data.status, resolvedAt: parsed.data.status === "RESOLVED" ? now : null, archivedAt: parsed.data.status === "ARCHIVED" ? now : null, spamAt: parsed.data.status === "SPAM" ? now : null } });
    await recordCommunicationAudit({ actor: admin, action: "THREAD_STATUS_UPDATE", channel: "EMAIL", resourceType: "THREAD", resourceId: thread.id, statusBefore: thread.status, statusAfter: parsed.data.status }, tx);
  });
  revalidateCommunications(thread.id);
  return { success: true, data: { threadId: thread.id } };
}

export async function archiveThreadAction(input: unknown) { return updateThreadStatusAction({ ...((parseSubmission(input) as object) ?? {}), status: "ARCHIVED" }); }
export async function restoreThreadAction(input: unknown) { return updateThreadStatusAction({ ...((parseSubmission(input) as object) ?? {}), status: "OPEN" }); }
export async function markThreadSpamAction(input: unknown) { return updateThreadStatusAction({ ...((parseSubmission(input) as object) ?? {}), status: "SPAM" }); }

export async function createInternalNoteAction(rawInput: unknown): Promise<ActionResult<{ id: string }>> {
  const admin = await actor();
  const parsed = createInternalNoteSchema.safeParse(parseSubmission(rawInput));
  if (!parsed.success) return validationError(parsed.error);
  const thread = await prisma.communicationThread.findFirst({ where: { id: parsed.data.threadId, deletedAt: null }, select: { id: true } });
  if (!thread) return { success: false, message: "Conversación no encontrada." };
  const note = await prisma.$transaction(async (tx) => {
    const created = await tx.communicationInternalNote.create({ data: { threadId: thread.id, authorUserId: admin.userId, authorEmail: admin.email, content: parsed.data.content } });
    await recordCommunicationAudit({ actor: admin, action: "INTERNAL_NOTE_CREATE", channel: "EMAIL", resourceType: "INTERNAL_NOTE", resourceId: created.id, safeMetadata: { threadId: thread.id } }, tx);
    return created;
  });
  revalidateCommunications(thread.id);
  return { success: true, data: { id: note.id } };
}

export async function createEmailDraftAction(rawInput: unknown): Promise<ActionResult<{ messageId: string; threadId: string }>> {
  const admin = await actor();
  const parsed = saveEmailDraftSchema.safeParse(parseSubmission(rawInput));
  if (!parsed.success) return validationError(parsed.error);
  const result = await prisma.$transaction(async (tx) => {
    const duplicate = await tx.communicationMessage.findUnique({ where: { idempotencyKey: parsed.data.idempotencyKey }, select: { id: true, threadId: true, sentByUserId: true } });
    if (duplicate?.threadId && duplicate.sentByUserId === admin.userId) return { messageId: duplicate.id, threadId: duplicate.threadId };
    let threadId = parsed.data.threadId;
    if (threadId) {
      const exists = await tx.communicationThread.findFirst({ where: { id: threadId, deletedAt: null }, select: { id: true } });
      if (!exists) throw new Error("THREAD_NOT_FOUND");
    } else {
      const thread = await tx.communicationThread.create({ data: { subject: parsed.data.subject, status: "RESOLVED", lastMessageAt: new Date() } });
      threadId = thread.id;
    }
    let message;
    if (parsed.data.messageId) {
      const existing = await tx.communicationMessage.findFirst({ where: { id: parsed.data.messageId, status: "DRAFT", deletedAt: null, sentByUserId: admin.userId }, select: { id: true } });
      if (!existing) throw new Error("DRAFT_NOT_FOUND");
      message = await tx.communicationMessage.update({ where: { id: existing.id }, data: { threadId, toAddresses: parsed.data.to, ccAddresses: parsed.data.cc, bccAddresses: parsed.data.bcc, subject: parsed.data.subject, textContent: parsed.data.content, sanitizedHtml: safeAdminHtmlFromText(parsed.data.content), kind: parsed.data.kind, templateVersionId: parsed.data.templateVersionId } });
    } else {
      message = await tx.communicationMessage.create({ data: { threadId, direction: "OUTBOUND", kind: parsed.data.kind, status: "DRAFT", idempotencyKey: parsed.data.idempotencyKey, fromAddress: process.env.RESEND_FROM ?? null, toAddresses: parsed.data.to, ccAddresses: parsed.data.cc, bccAddresses: parsed.data.bcc, subject: parsed.data.subject, textContent: parsed.data.content, sanitizedHtml: safeAdminHtmlFromText(parsed.data.content), sentByUserId: admin.userId, sentByEmail: admin.email, templateVersionId: parsed.data.templateVersionId } });
    }
    await tx.communicationThread.update({ where: { id: threadId }, data: { subject: parsed.data.subject, lastMessageAt: new Date() } });
    await recordCommunicationAudit({ actor: admin, action: "EMAIL_DRAFT_SAVE", channel: "EMAIL", resourceType: "MESSAGE", resourceId: message.id, statusAfter: "DRAFT" }, tx);
    return { messageId: message.id, threadId };
  }).catch((error: unknown) => ({ error: safeError(error) }));
  if ("error" in result) return { success: false, message: result.error === "DRAFT_NOT_FOUND" ? "Borrador no encontrado." : "No se pudo guardar el borrador." };
  revalidateCommunications(result.threadId);
  return { success: true, data: result };
}

export async function updateEmailDraftAction(rawInput: unknown) { return createEmailDraftAction(rawInput); }

export async function deleteEmailDraftAction(rawInput: unknown): Promise<ActionResult<{ messageId: string }>> {
  const admin = await actor();
  const raw = parseSubmission(rawInput);
  const parsed = threadIdSchema.extend({ messageId: threadIdSchema.shape.threadId }).safeParse(raw);
  if (!parsed.success) return validationError(parsed.error);
  const message = await prisma.communicationMessage.findFirst({ where: { id: parsed.data.messageId, threadId: parsed.data.threadId, status: "DRAFT", deletedAt: null }, select: { id: true } });
  if (!message) return { success: false, message: "Borrador no encontrado." };
  await prisma.$transaction(async (tx) => {
    await tx.communicationMessage.update({ where: { id: message.id }, data: { deletedAt: new Date(), status: "CANCELLED" } });
    await recordCommunicationAudit({ actor: admin, action: "EMAIL_DRAFT_DELETE", channel: "EMAIL", resourceType: "MESSAGE", resourceId: message.id, statusBefore: "DRAFT", statusAfter: "CANCELLED" }, tx);
  });
  revalidateCommunications(parsed.data.threadId);
  return { success: true, data: { messageId: message.id } };
}

export async function sendNewEmailAction(rawInput: unknown): Promise<ActionResult<{ messageId: string; threadId: string; status: "ACCEPTED" }>> {
  const admin = await actor();
  const parsed = sendEmailSchema.safeParse(parseSubmission(rawInput));
  if (!parsed.success) return validationError(parsed.error);
  try {
    await enforceCommunicationRateLimit(admin.userId, parsed.data.threadId ? "EMAIL_REPLY" : "EMAIL_NEW");
  } catch {
    return { success: false, message: "Límite de envíos alcanzado. Intenta más tarde." };
  }
  if (parsed.data.kind === "MARKETING") {
    const users = await prisma.user.findMany({ where: { email: { in: parsed.data.to }, accountStatus: "ACTIVE", communicationPreference: { is: { marketingEmail: true, marketingConsentAt: { not: null }, marketingOptOutAt: null } } }, select: { email: true } });
    if (users.length !== new Set(parsed.data.to).size) return { success: false, message: "Todos los destinatarios de marketing deben tener consentimiento vigente." };
  }
  const draftResult = parsed.data.messageId
    ? await createEmailDraftAction({ ...parsed.data, messageId: parsed.data.messageId })
    : await createEmailDraftAction(parsed.data);
  if (!draftResult.success) return draftResult;
  const message = await prisma.communicationMessage.findUniqueOrThrow({ where: { id: draftResult.data.messageId }, select: { id: true, threadId: true, status: true, attachments: { where: { scanStatus: "NOT_AVAILABLE", objectKey: { not: null } }, select: { objectKey: true, fileName: true, mimeType: true } } } });
  if (message.status !== "DRAFT" || !message.threadId) return { success: false, message: "El mensaje ya no es un borrador enviable." };
  try {
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
    const attachments = await Promise.all(message.attachments.map(async (attachment) => ({ path: await getCommunicationAttachmentUrl(attachment.objectKey!), filename: attachment.fileName, contentType: attachment.mimeType })));
    const response = await sendWithResend({ to: parsed.data.to, cc: parsed.data.cc, bcc: parsed.data.bcc, subject: parsed.data.subject, text: parsed.data.content, react: AdminComposedEmail({ subject: parsed.data.subject, content: parsed.data.content, appUrl }), idempotencyKey: parsed.data.idempotencyKey, tags: [{ name: "message_id", value: message.id }], attachments });
    await prisma.$transaction(async (tx) => {
      await tx.communicationMessage.update({ where: { id: message.id }, data: { status: "ACCEPTED", provider: "RESEND", externalId: response.id, acceptedAt: new Date(), sentAt: new Date() } });
      await tx.communicationThread.update({ where: { id: message.threadId! }, data: { status: "PENDING", unreadCount: 0, lastMessageAt: new Date(), lastOutboundAt: new Date() } });
      await recordCommunicationAudit({ actor: admin, action: parsed.data.threadId ? "EMAIL_REPLY" : "EMAIL_NEW", channel: "EMAIL", resourceType: "MESSAGE", resourceId: message.id, statusBefore: "DRAFT", statusAfter: "ACCEPTED", affectedRecipients: new Set([...parsed.data.to, ...parsed.data.cc, ...parsed.data.bcc]).size, maskedRecipient: maskEmail(parsed.data.to[0]), externalId: response.id }, tx);
    });
    revalidateCommunications(message.threadId);
    return { success: true, data: { messageId: message.id, threadId: message.threadId, status: "ACCEPTED" } };
  } catch (error) {
    const code = safeError(error);
    await prisma.$transaction(async (tx) => {
      await tx.communicationMessage.update({ where: { id: message.id }, data: { status: "FAILED", failedAt: new Date(), providerMetadata: { errorCode: code } } });
      await recordCommunicationAudit({ actor: admin, action: parsed.data.threadId ? "EMAIL_REPLY" : "EMAIL_NEW", channel: "EMAIL", resourceType: "MESSAGE", resourceId: message.id, statusBefore: "DRAFT", statusAfter: "FAILED", result: "FAILED", errorCode: code }, tx);
    });
    log.error({ operation: "send_email", messageId: message.id, actor: admin.userId, errorCode: code }, "Administrative email failed");
    revalidateCommunications(message.threadId);
    return { success: false, message: code.includes("NOT_CONFIGURED") ? "Resend no está configurado." : "Resend no aceptó el mensaje. Revisa el estado e intenta nuevamente." };
  }
}

export async function sendEmailReplyAction(rawInput: unknown) { return sendNewEmailAction(rawInput); }
