import "server-only";

import type { EmailMessageStatus } from "@/generated/prisma/client";
import { recordCommunicationAudit } from "@/lib/communications/audit";
import { sanitizeEmailHtml, plainTextFromHtml, safeError } from "@/lib/communications/security";
import { shouldApplyEmailStatus } from "@/lib/communications/status";
import { requireResendClient } from "@/lib/email/resend-client";
import { createLogger } from "@/lib/logger";
import prisma from "@/lib/prisma";

const log = createLogger({ module: "resend-webhook" });

type SafeResendEvent = {
  type: string;
  created_at: string;
  data: { email_id?: string; from?: string; to?: string[]; subject?: string; message_id?: string };
};

function extractAddress(value: string): string | null {
  const angle = value.match(/<([^<>\s]+@[^<>\s]+)>/);
  const plain = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return (angle?.[1] ?? plain?.[0] ?? null)?.toLowerCase() ?? null;
}

function eventStatus(type: string): EmailMessageStatus | null {
  return ({
    "email.scheduled": "QUEUED", "email.sent": "SENT", "email.delivered": "DELIVERED",
    "email.delivery_delayed": "DELAYED", "email.bounced": "BOUNCED",
    "email.complained": "COMPLAINED", "email.failed": "FAILED", "email.suppressed": "FAILED",
  } as Record<string, EmailMessageStatus>)[type] ?? null;
}

export async function processResendWebhook(eventId: string, rawEvent: SafeResendEvent) {
  const emailId = rawEvent.data.email_id;
  const inserted = await prisma.communicationWebhookEvent.create({ data: { provider: "RESEND", externalEventId: eventId, eventType: rawEvent.type, resourceExternalId: emailId, status: "PROCESSING" } }).catch(() => null);
  if (!inserted) return { duplicate: true };
  try {
    if (rawEvent.type === "email.received" && emailId) {
      await processInboundEmail(emailId, eventId);
    } else {
      const nextStatus = eventStatus(rawEvent.type);
      if (nextStatus && emailId) await processDeliveryEvent(emailId, eventId, rawEvent.type, rawEvent.created_at, nextStatus);
    }
    await prisma.communicationWebhookEvent.update({ where: { id: inserted.id }, data: { status: "PROCESSED", processedAt: new Date() } });
    return { duplicate: false };
  } catch (error) {
    const errorCode = safeError(error);
    await prisma.communicationWebhookEvent.update({ where: { id: inserted.id }, data: { status: "FAILED", errorCode, processedAt: new Date() } });
    log.error({ eventId, eventType: rawEvent.type, externalId: emailId ? `…${emailId.slice(-8)}` : null, errorCode }, "Resend webhook failed");
    throw error;
  }
}

async function processDeliveryEvent(emailId: string, eventId: string, type: string, occurredAtRaw: string, nextStatus: EmailMessageStatus) {
  const message = await prisma.communicationMessage.findFirst({ where: { provider: "RESEND", externalId: emailId }, select: { id: true, status: true } });
  if (!message) throw new Error("MESSAGE_NOT_FOUND");
  const occurredAt = new Date(occurredAtRaw);
  await prisma.$transaction(async (tx) => {
    await tx.communicationEmailEvent.create({ data: { messageId: message.id, providerEventId: eventId, type, occurredAt, safeMetadata: { provider: "RESEND" } } });
    if (shouldApplyEmailStatus(message.status, nextStatus)) {
      await tx.communicationMessage.update({ where: { id: message.id }, data: { status: nextStatus, sentAt: nextStatus === "SENT" ? occurredAt : undefined, deliveredAt: nextStatus === "DELIVERED" ? occurredAt : undefined, failedAt: ["FAILED", "BOUNCED", "COMPLAINED"].includes(nextStatus) ? occurredAt : undefined } });
    }
    await recordCommunicationAudit({ action: "EMAIL_PROVIDER_EVENT", channel: "EMAIL", resourceType: "MESSAGE", resourceId: message.id, statusBefore: message.status, statusAfter: nextStatus, externalId: emailId, safeMetadata: { eventType: type } }, tx);
  });
}

async function processInboundEmail(emailId: string, eventId: string) {
  const response = await requireResendClient().emails.receiving.get(emailId, { html_format: "cid" });
  if (response.error || !response.data) throw new Error(response.error?.message ?? "INBOUND_FETCH_FAILED");
  const email = response.data;
  const sender = extractAddress(email.from);
  if (!sender) throw new Error("INVALID_INBOUND_SENDER");
  const safe = sanitizeEmailHtml(email.html ?? "");
  const text = (email.text?.trim() || plainTextFromHtml(email.html ?? "") || "(Mensaje sin contenido legible)").slice(0, 50_000);
  const inReplyTo = email.headers?.["in-reply-to"] ?? email.headers?.["In-Reply-To"];
  const references = email.headers?.references ?? email.headers?.References;
  const relatedMessage = inReplyTo || references ? await prisma.communicationMessage.findFirst({ where: { OR: [{ externalId: inReplyTo ?? undefined }, { providerMetadata: { path: ["messageId"], string_contains: inReplyTo ?? references ?? "" } }] }, select: { threadId: true } }).catch(() => null) : null;
  const user = await prisma.user.findFirst({ where: { email: { equals: sender, mode: "insensitive" }, emailVerified: true, accountStatus: { not: "ANONYMIZED" } }, select: { id: true } });
  await prisma.$transaction(async (tx) => {
    let threadId = relatedMessage?.threadId ?? null;
    if (!threadId) {
      const thread = await tx.communicationThread.create({ data: { subject: email.subject || "Sin asunto", status: "OPEN", userId: user?.id, unreadCount: 1, lastMessageAt: new Date(email.created_at), lastInboundAt: new Date(email.created_at) } });
      threadId = thread.id;
    } else {
      await tx.communicationThread.update({ where: { id: threadId }, data: { status: "OPEN", unreadCount: { increment: 1 }, lastMessageAt: new Date(email.created_at), lastInboundAt: new Date(email.created_at) } });
    }
    const message = await tx.communicationMessage.create({ data: { threadId, direction: "INBOUND", kind: "SUPPORT", status: "DELIVERED", provider: "RESEND", externalId: email.id, fromAddress: sender, fromName: email.from.replace(/<.*$/, "").trim() || null, toAddresses: email.to, ccAddresses: email.cc ?? [], bccAddresses: [], replyToAddress: email.reply_to?.[0] ?? sender, subject: email.subject || "Sin asunto", textContent: text, sanitizedHtml: safe.html || null, remoteImages: safe.hadRemoteImages, providerMetadata: { messageId: email.message_id, receivedFor: email.received_for }, deliveredAt: new Date(email.created_at), attachments: { create: email.attachments.filter((attachment) => attachment.size <= 10 * 1024 * 1024 && !/\.(exe|msi|bat|cmd|com|scr|js|jar|ps1)$/i.test(attachment.filename ?? "")).slice(0, 10).map((attachment) => ({ providerId: attachment.id, fileName: (attachment.filename || "adjunto").replace(/[^\p{L}\p{N}._ -]/gu, "_").slice(0, 180), mimeType: attachment.content_type, sizeBytes: BigInt(attachment.size), contentId: attachment.content_id, inline: attachment.content_disposition === "inline", scanStatus: "NOT_AVAILABLE" })) } } });
    await tx.communicationEmailEvent.create({ data: { messageId: message.id, providerEventId: eventId, type: "email.received", occurredAt: new Date(email.created_at), safeMetadata: { attachmentCount: email.attachments.length } } });
    await recordCommunicationAudit({ action: "EMAIL_INBOUND_RECEIVED", channel: "EMAIL", resourceType: "MESSAGE", resourceId: message.id, statusAfter: "DELIVERED", maskedRecipient: sender.replace(/^(.{2}).+(@.+)$/, "$1***$2"), externalId: email.id, safeMetadata: { threadId, linkedUser: Boolean(user) } }, tx);
  });
}
