"use server";

import { revalidatePath } from "next/cache";
import { flattenError } from "zod";

import { Prisma } from "@/generated/prisma/client";
import type { ActionResult } from "@/lib/actions/types";
import { requireSession } from "@/lib/auth/session";
import { getCategoryDescendantIds } from "@/lib/categories/queries";
import prisma from "@/lib/prisma";
import { slugify } from "@/lib/products/format";
import { deleteImageFromR2 } from "@/lib/r2";
import type { AssetInput } from "@/lib/validations/assets";
import {
  createCategorySchema,
  deleteCategorySchema,
  updateCategorySchema,
} from "@/lib/validations/categories";

function unauthorized<T>(): ActionResult<T> {
  return { success: false, message: "No autorizado. Inicia sesión para continuar." };
}

function validationError<T>(error: Parameters<typeof flattenError>[0]): ActionResult<T> {
  const flat = flattenError(error);
  return { success: false, message: "Revisa los campos del formulario.", fieldErrors: flat.fieldErrors };
}

function parseSubmission(rawInput: unknown): unknown {
  if (!(rawInput instanceof FormData)) return rawInput;
  const payload = rawInput.get("payload");
  return typeof payload === "string" ? JSON.parse(payload) : null;
}

function assetData(asset: AssetInput, categoryId: string) {
  return {
    type: asset.type,
    url: asset.url,
    objectKey: asset.objectKey ?? null,
    youtubeId: asset.youtubeId ?? null,
    mimeType: asset.mimeType ?? null,
    fileName: asset.fileName ?? null,
    sizeBytes: asset.sizeBytes != null ? BigInt(asset.sizeBytes) : null,
    thumbnailUrl: asset.thumbnailUrl ?? null,
    altText: asset.altText ?? null,
    sortOrder: asset.sortOrder,
    isCover: asset.type === "IMAGE" && asset.isCover,
    categoryId,
  };
}

function coverUrl(assets: AssetInput[]): string | null {
  return assets.find((asset) => asset.type === "IMAGE" && asset.isCover)?.url ??
    assets.find((asset) => asset.type === "IMAGE")?.url ?? null;
}

async function assertValidParent(parentId: string | null | undefined, categoryId?: string): Promise<ActionResult<never> | null> {
  if (!parentId) return null;
  const parent = await prisma.category.findUnique({ where: { id: parentId }, select: { id: true } });
  if (!parent) return { success: false, message: "La categoría padre no existe.", fieldErrors: { parentId: ["Categoría padre inválida"] } };
  if (categoryId) {
    const blocked = await getCategoryDescendantIds(categoryId);
    if (blocked.has(parentId)) return { success: false, message: "No puedes asignar una categoría hija como padre.", fieldErrors: { parentId: ["Jerarquía inválida"] } };
  }
  return null;
}

export async function createCategoryAction(rawInput: unknown): Promise<ActionResult<{ id: string }>> {
  if (!(await requireSession())) return unauthorized();
  let input: unknown;
  try { input = parseSubmission(rawInput); } catch { return { success: false, message: "Los datos del formulario son inválidos." }; }
  const parsed = createCategorySchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const data = parsed.data;
  const parentError = await assertValidParent(data.parentId);
  if (parentError) return parentError;
  if (!coverUrl(data.assets) && !data.imageUrl) return { success: false, message: "Agrega al menos una fotografía a la categoría.", fieldErrors: { assets: ["Agrega una fotografía."] } };

  try {
    const category = await prisma.$transaction(async (tx) => {
      const created = await tx.category.create({
        data: { name: data.name, slug: data.slug || slugify(data.name), description: data.description ?? null, imageUrl: coverUrl(data.assets) ?? data.imageUrl ?? null, parentId: data.parentId ?? null },
        select: { id: true },
      });
      if (data.assets.length) await tx.asset.createMany({ data: data.assets.map((asset) => assetData(asset, created.id)) });
      return created;
    });
    revalidatePath("/admin/categories");
    revalidatePath("/admin/products");
    return { success: true, data: category };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { success: false, message: "Ya existe una categoría con ese slug.", fieldErrors: { slug: ["Slug duplicado"] } };
    return { success: false, message: "No se pudo crear la categoría." };
  }
}

export async function updateCategoryAction(rawInput: unknown): Promise<ActionResult<{ id: string }>> {
  if (!(await requireSession())) return unauthorized();
  let input: unknown;
  try { input = parseSubmission(rawInput); } catch { return { success: false, message: "Los datos del formulario son inválidos." }; }
  const parsed = updateCategorySchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const data = parsed.data;
  const parentError = await assertValidParent(data.parentId, data.id);
  if (parentError) return parentError;
  if (!coverUrl(data.assets) && !data.imageUrl) return { success: false, message: "Agrega al menos una fotografía a la categoría.", fieldErrors: { assets: ["Agrega una fotografía."] } };

  let removedKeys: string[] = [];
  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.asset.findMany({ where: { categoryId: data.id }, select: { objectKey: true } });
      const retained = new Set(data.assets.flatMap((asset) => asset.objectKey ? [asset.objectKey] : []));
      removedKeys = existing.flatMap((asset) => asset.objectKey && !retained.has(asset.objectKey) ? [asset.objectKey] : []);
      await tx.category.update({ where: { id: data.id }, data: { name: data.name, slug: data.slug, description: data.description ?? null, imageUrl: coverUrl(data.assets) ?? data.imageUrl ?? null, parentId: data.parentId ?? null } });
      await tx.asset.deleteMany({ where: { categoryId: data.id } });
      if (data.assets.length) await tx.asset.createMany({ data: data.assets.map((asset) => assetData(asset, data.id)) });
    });
    await Promise.all(removedKeys.map((key) => deleteImageFromR2(key).catch(() => undefined)));
    revalidatePath("/admin/categories");
    revalidatePath(`/admin/categories/${data.id}`);
    revalidatePath("/admin/products");
    return { success: true, data: { id: data.id } };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") return { success: false, message: "Categoría no encontrada." };
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { success: false, message: "Ya existe una categoría con ese slug.", fieldErrors: { slug: ["Slug duplicado"] } };
    return { success: false, message: "No se pudo actualizar la categoría." };
  }
}

export async function deleteCategoryAction(rawInput: unknown): Promise<ActionResult<{ id: string }>> {
  if (!(await requireSession())) return unauthorized();
  const parsed = deleteCategorySchema.safeParse(rawInput);
  if (!parsed.success) return validationError(parsed.error);
  try {
    const category = await prisma.category.findUnique({ where: { id: parsed.data.id }, select: { assets: { select: { objectKey: true } } } });
    await prisma.category.delete({ where: { id: parsed.data.id } });
    await Promise.all((category?.assets ?? []).flatMap((asset) => asset.objectKey ? [deleteImageFromR2(asset.objectKey).catch(() => undefined)] : []));
    revalidatePath("/admin/categories");
    revalidatePath("/admin/products");
    return { success: true, data: { id: parsed.data.id } };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") return { success: false, message: "Categoría no encontrada." };
    return { success: false, message: "No se pudo eliminar la categoría." };
  }
}
