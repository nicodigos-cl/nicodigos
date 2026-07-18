"use server";

import { z } from "zod";

import type { ActionResult } from "@/lib/actions/types";
import { requireSession } from "@/lib/auth/session";
import { createR2UploadUrl, deleteImageFromR2 } from "@/lib/r2";

const uploadSchema = z.object({
  contentType: z.string().min(1).max(120),
  size: z.coerce.number().int().positive(),
  folder: z.enum(["products", "categories"]),
});

const discardSchema = z.object({
  key: z.string().regex(/^(products|categories)\/[0-9]{4}-[0-9]{2}-[0-9]{2}\/[a-f0-9-]+\.[a-z0-9]+$/),
});

export async function createAssetUploadAction(
  rawInput: unknown,
): Promise<ActionResult<{ uploadUrl: string; key: string; url: string }>> {
  const session = await requireSession();
  if (!session || session.user.role !== "ADMIN") {
    return { success: false, message: "No autorizado." };
  }
  const parsed = uploadSchema.safeParse(rawInput);
  if (!parsed.success) return { success: false, message: "Archivo inválido." };

  try {
    const result = await createR2UploadUrl(parsed.data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("INVALID_MEDIA:")) {
      return { success: false, message: error.message.slice(14) };
    }
    if (error instanceof Error && error.message.startsWith("R2_CONFIG_MISSING:")) {
      return { success: false, message: "El almacenamiento R2 no está configurado." };
    }
    return { success: false, message: "No se pudo preparar la subida." };
  }
}

export async function discardAssetUploadAction(rawInput: unknown): Promise<ActionResult<null>> {
  const session = await requireSession();
  if (!session || session.user.role !== "ADMIN") return { success: false, message: "No autorizado." };
  const parsed = discardSchema.safeParse(rawInput);
  if (!parsed.success) return { success: false, message: "Archivo inválido." };
  await deleteImageFromR2(parsed.data.key).catch(() => undefined);
  return { success: true, data: null };
}
