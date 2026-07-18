"use server";
import type { ActionResult } from "@/lib/actions/types";
import { requireAdminSession } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { createCommunicationAttachmentUploadUrl, getCommunicationAttachmentUrl, verifyCommunicationAttachment } from "@/lib/r2";
import { requireResendClient } from "@/lib/email/resend-client";
import { z } from "zod";

const schema = z.object({ messageId: z.string().cuid(), fileName: z.string().trim().min(1).max(180), mimeType: z.enum(["application/pdf", "image/jpeg", "image/png", "image/webp", "text/plain", "text/csv"]), size: z.number().int().positive().max(10 * 1024 * 1024) });
const finalizeSchema = z.object({ attachmentId: z.string().cuid() });
export async function createCommunicationAttachmentUploadAction(rawInput: unknown): Promise<ActionResult<{ attachmentId: string; uploadUrl: string }>> {
  await requireAdminSession(); const parsed = schema.safeParse(rawInput); if (!parsed.success) return { success: false, message: "Adjunto inválido o mayor a 10 MB." };
  const message = await prisma.communicationMessage.findFirst({ where: { id: parsed.data.messageId, status: "DRAFT", deletedAt: null }, select: { id: true, _count: { select: { attachments: true } } } });
  if (!message || message._count.attachments >= 10) return { success: false, message: "El borrador no admite más adjuntos." };
  const extension = parsed.data.fileName.split(".").pop()?.toLowerCase(); const valid: Record<string, string[]> = { "application/pdf": ["pdf"], "image/jpeg": ["jpg", "jpeg"], "image/png": ["png"], "image/webp": ["webp"], "text/plain": ["txt"], "text/csv": ["csv"] };
  if (!extension || !valid[parsed.data.mimeType].includes(extension)) return { success: false, message: "La extensión no coincide con el tipo del archivo." };
  const upload = await createCommunicationAttachmentUploadUrl({ contentType: parsed.data.mimeType, size: parsed.data.size });
  const attachment = await prisma.communicationAttachment.create({ data: { messageId: message.id, objectKey: upload.key, fileName: parsed.data.fileName.replace(/[^\p{L}\p{N}._ -]/gu, "_").slice(0, 180), mimeType: parsed.data.mimeType, sizeBytes: BigInt(parsed.data.size), scanStatus: "PENDING_UPLOAD" } });
  return { success: true, data: { attachmentId: attachment.id, uploadUrl: upload.uploadUrl } };
}
export async function finalizeCommunicationAttachmentAction(rawInput: unknown): Promise<ActionResult<{ id: string }>> {
  await requireAdminSession(); const parsed = finalizeSchema.safeParse(rawInput); if (!parsed.success) return { success: false, message: "Adjunto inválido." };
  const attachment = await prisma.communicationAttachment.findUnique({ where: { id: parsed.data.attachmentId }, select: { id: true, objectKey: true, mimeType: true, sizeBytes: true, message: { select: { status: true } } } });
  if (!attachment?.objectKey || attachment.message.status !== "DRAFT") return { success: false, message: "El borrador ya no admite cambios." };
  try { await verifyCommunicationAttachment({ key: attachment.objectKey, contentType: attachment.mimeType, size: Number(attachment.sizeBytes) }); await prisma.communicationAttachment.update({ where: { id: attachment.id }, data: { scanStatus: "NOT_AVAILABLE" } }); return { success: true, data: { id: attachment.id } }; } catch { return { success: false, message: "El archivo subido no coincide con la metadata validada." }; }
}

export async function getCommunicationAttachmentDownloadAction(rawInput: unknown): Promise<ActionResult<{ url: string; expiresAt: string | null }>> {
  await requireAdminSession(); const parsed = finalizeSchema.safeParse(rawInput); if (!parsed.success) return { success: false, message: "Adjunto inválido." };
  const attachment = await prisma.communicationAttachment.findUnique({ where: { id: parsed.data.attachmentId }, select: { objectKey: true, providerId: true, message: { select: { provider: true, externalId: true } } } });
  if (!attachment) return { success: false, message: "Adjunto no encontrado." };
  if (attachment.objectKey) return { success: true, data: { url: await getCommunicationAttachmentUrl(attachment.objectKey), expiresAt: new Date(Date.now() + 300_000).toISOString() } };
  if (attachment.providerId && attachment.message.provider === "RESEND" && attachment.message.externalId) {
    const result = await requireResendClient().emails.receiving.attachments.get({ emailId: attachment.message.externalId, id: attachment.providerId });
    if (result.error || !result.data?.download_url) return { success: false, message: "Resend no pudo preparar el adjunto." };
    return { success: true, data: { url: result.data.download_url, expiresAt: result.data.expires_at } };
  }
  return { success: false, message: "El adjunto no está disponible." };
}
