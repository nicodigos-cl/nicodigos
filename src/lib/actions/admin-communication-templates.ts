"use server";

import { revalidatePath } from "next/cache";
import { flattenError } from "zod";
import type { ActionResult } from "@/lib/actions/types";
import { requireAdminSession } from "@/lib/auth/session";
import { recordCommunicationAudit } from "@/lib/communications/audit";
import { findTemplateVariables, previewCommunicationTemplate } from "@/lib/communications/templates";
import prisma from "@/lib/prisma";
import { templateSchema } from "@/lib/validations/communications";

function parse(input: unknown): unknown { if (!(input instanceof FormData)) return input; const payload = input.get("payload"); try { return typeof payload === "string" ? JSON.parse(payload) as unknown : null; } catch { return null; } }
function invalid<T>(error: Parameters<typeof flattenError>[0]): ActionResult<T> { const flat = flattenError(error); return { success: false, message: "Revisa los datos del formulario.", fieldErrors: flat.fieldErrors }; }
async function actor() { const session = await requireAdminSession(); return { userId: session.user.id, email: session.user.email }; }
function refresh() { revalidatePath("/admin/communications"); revalidatePath("/admin/communications/templates"); }

export async function createCommunicationTemplateAction(rawInput: unknown): Promise<ActionResult<{ id: string; version: number }>> {
  const admin = await actor(); const parsed = templateSchema.safeParse(parse(rawInput)); if (!parsed.success) return invalid(parsed.error);
  const input = parsed.data;
  const found = new Set(findTemplateVariables(`${input.subject ?? ""}\n${input.title ?? ""}\n${input.content}`));
  if ([...found].some((variable) => !input.variables.includes(variable as never))) return { success: false, message: "El contenido usa variables que no fueron declaradas o no están permitidas." };
  try { previewCommunicationTemplate(`${input.subject ?? input.title ?? ""}\n${input.content}`); } catch { return { success: false, message: "La plantilla contiene una variable desconocida." }; }
  const result = await prisma.$transaction(async (tx) => {
    if (input.templateId) {
      const current = await tx.communicationTemplate.findFirst({ where: { id: input.templateId, deletedAt: null }, select: { id: true, currentVersion: true, status: true } });
      if (!current) throw new Error("NOT_FOUND");
      const version = current.currentVersion + 1;
      await tx.communicationTemplate.update({ where: { id: current.id }, data: { name: input.name, slug: input.slug, channel: input.channel, kind: input.kind, status: input.status, currentVersion: version, updatedByUserId: admin.userId, updatedByEmail: admin.email, archivedAt: null } });
      await tx.communicationTemplateVersion.create({ data: { templateId: current.id, version, subject: input.subject, title: input.title, content: input.content, textContent: input.content, variables: input.variables, changeReason: input.changeReason, createdByUserId: admin.userId, createdByEmail: admin.email } });
      await recordCommunicationAudit({ actor: admin, action: "TEMPLATE_VERSION_CREATE", resourceType: "TEMPLATE", resourceId: current.id, statusBefore: current.status, statusAfter: input.status, safeMetadata: { version } }, tx);
      return { id: current.id, version };
    }
    const created = await tx.communicationTemplate.create({ data: { name: input.name, slug: input.slug, channel: input.channel, kind: input.kind, status: input.status, createdByUserId: admin.userId, createdByEmail: admin.email, versions: { create: { version: 1, subject: input.subject, title: input.title, content: input.content, textContent: input.content, variables: input.variables, changeReason: input.changeReason, createdByUserId: admin.userId, createdByEmail: admin.email } } } });
    await recordCommunicationAudit({ actor: admin, action: "TEMPLATE_CREATE", resourceType: "TEMPLATE", resourceId: created.id, statusAfter: input.status, safeMetadata: { version: 1 } }, tx);
    return { id: created.id, version: 1 };
  }).catch((error: unknown) => ({ error: error instanceof Error ? error.message : "UNKNOWN" }));
  if ("error" in result) return { success: false, message: result.error.includes("Unique") ? "Ya existe una plantilla con ese slug." : "No se pudo guardar la plantilla." };
  refresh(); return { success: true, data: result };
}
export async function updateCommunicationTemplateAction(input: unknown) { return createCommunicationTemplateAction(input); }

export async function archiveCommunicationTemplateAction(rawInput: unknown): Promise<ActionResult<{ id: string }>> {
  const admin = await actor(); const input = parse(rawInput); const id = typeof input === "object" && input && "templateId" in input && typeof input.templateId === "string" ? input.templateId : "";
  const current = await prisma.communicationTemplate.findFirst({ where: { id, deletedAt: null }, select: { id: true, status: true } }); if (!current) return { success: false, message: "Plantilla no encontrada." };
  await prisma.$transaction(async (tx) => { await tx.communicationTemplate.update({ where: { id }, data: { status: "ARCHIVED", archivedAt: new Date(), updatedByUserId: admin.userId, updatedByEmail: admin.email } }); await recordCommunicationAudit({ actor: admin, action: "TEMPLATE_ARCHIVE", resourceType: "TEMPLATE", resourceId: id, statusBefore: current.status, statusAfter: "ARCHIVED" }, tx); }); refresh(); return { success: true, data: { id } };
}
export async function restoreCommunicationTemplateAction(rawInput: unknown): Promise<ActionResult<{ id: string }>> {
  const admin = await actor(); const input = parse(rawInput); const id = typeof input === "object" && input && "templateId" in input && typeof input.templateId === "string" ? input.templateId : "";
  const current = await prisma.communicationTemplate.findFirst({ where: { id, status: "ARCHIVED", deletedAt: null }, select: { id: true } }); if (!current) return { success: false, message: "Plantilla archivada no encontrada." };
  await prisma.$transaction(async (tx) => { await tx.communicationTemplate.update({ where: { id }, data: { status: "DRAFT", archivedAt: null, updatedByUserId: admin.userId, updatedByEmail: admin.email } }); await recordCommunicationAudit({ actor: admin, action: "TEMPLATE_RESTORE", resourceType: "TEMPLATE", resourceId: id, statusBefore: "ARCHIVED", statusAfter: "DRAFT" }, tx); }); refresh(); return { success: true, data: { id } };
}
