"use server";

import { revalidatePath } from "next/cache";
import { flattenError } from "zod";

import { Prisma } from "@/generated/prisma/client";
import type { ActionResult } from "@/lib/actions/types";
import { requireSession } from "@/lib/auth/session";
import { getCategoryById, getCategoryDescendantIds } from "@/lib/categories/queries";
import prisma from "@/lib/prisma";
import { slugify } from "@/lib/products/format";
import { deleteImageFromR2 } from "@/lib/r2";
import type { AssetInput } from "@/lib/validations/assets";
import {
  createCategorySchema,
  deleteCategorySchema,
  reorderCategoriesSchema,
  updateCategorySchema,
} from "@/lib/validations/categories";
import type { CategoryDetailDto } from "@/types/categories";

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

export async function getCategoryForEditAction(
  rawInput: unknown,
): Promise<ActionResult<CategoryDetailDto>> {
  if (!(await requireSession())) return unauthorized();
  const parsed = deleteCategorySchema.safeParse(rawInput);
  if (!parsed.success) return validationError(parsed.error);

  const category = await getCategoryById(parsed.data.id);
  if (!category) {
    return { success: false, message: "Categoría no encontrada." };
  }
  return { success: true, data: category };
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
      const parentId = data.parentId ?? null;
      const siblingAgg = await tx.category.aggregate({
        where: { parentId },
        _max: { sortOrder: true },
      });
      const sortOrder = (siblingAgg._max.sortOrder ?? -1) + 1;

      const created = await tx.category.create({
        data: {
          name: data.name,
          slug: data.slug || slugify(data.name),
          description: data.description ?? null,
          imageUrl: coverUrl(data.assets) ?? data.imageUrl ?? null,
          parentId,
          sortOrder,
        },
        select: { id: true },
      });
      if (data.assets.length) {
        await tx.asset.createMany({
          data: data.assets.map((asset) => assetData(asset, created.id)),
        });
      }
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
      const current = await tx.category.findUnique({
        where: { id: data.id },
        select: { parentId: true, sortOrder: true },
      });
      if (!current) {
        throw new Error("CATEGORY_NOT_FOUND");
      }
      const nextParentId = data.parentId ?? null;
      let sortOrder = current.sortOrder;
      if (current.parentId !== nextParentId) {
        const siblingAgg = await tx.category.aggregate({
          where: { parentId: nextParentId },
          _max: { sortOrder: true },
        });
        sortOrder = (siblingAgg._max.sortOrder ?? -1) + 1;
      }
      await tx.category.update({
        where: { id: data.id },
        data: {
          name: data.name,
          slug: data.slug,
          description: data.description ?? null,
          imageUrl: coverUrl(data.assets) ?? data.imageUrl ?? null,
          parentId: nextParentId,
          sortOrder,
        },
      });
      await tx.asset.deleteMany({ where: { categoryId: data.id } });
      if (data.assets.length) await tx.asset.createMany({ data: data.assets.map((asset) => assetData(asset, data.id)) });
    });
    await Promise.all(removedKeys.map((key) => deleteImageFromR2(key).catch(() => undefined)));
    revalidatePath("/admin/categories");
    revalidatePath(`/admin/categories/${data.id}`);
    revalidatePath("/admin/products");
    return { success: true, data: { id: data.id } };
  } catch (error) {
    if (error instanceof Error && error.message === "CATEGORY_NOT_FOUND") {
      return { success: false, message: "Categoría no encontrada." };
    }
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

export async function reorderCategoriesAction(
  rawInput: unknown,
): Promise<ActionResult<{ updated: number }>> {
  if (!(await requireSession())) return unauthorized();

  const parsed = reorderCategoriesSchema.safeParse(rawInput);
  if (!parsed.success) return validationError(parsed.error);

  const items = parsed.data.items;
  const ids = items.map((item) => item.id);
  if (new Set(ids).size !== ids.length) {
    return { success: false, message: "Hay categorías duplicadas en el orden." };
  }

  const existing = await prisma.category.findMany({
    where: { id: { in: ids } },
    select: { id: true, parentId: true },
  });
  if (existing.length !== ids.length) {
    return { success: false, message: "Una o más categorías no existen." };
  }

  const existingIds = new Set(existing.map((row) => row.id));
  for (const item of items) {
    if (item.parentId && !existingIds.has(item.parentId)) {
      const parent = await prisma.category.findUnique({
        where: { id: item.parentId },
        select: { id: true },
      });
      if (!parent) {
        return {
          success: false,
          message: "La categoría padre no existe.",
          fieldErrors: { parentId: ["Categoría padre inválida"] },
        };
      }
    }
    if (item.parentId === item.id) {
      return {
        success: false,
        message: "Una categoría no puede ser su propio padre.",
      };
    }
  }

  // Prevent cycles: parent cannot be a descendant of the moved node.
  for (const item of items) {
    if (!item.parentId) continue;
    const blocked = await getCategoryDescendantIds(item.id);
    if (blocked.has(item.parentId)) {
      return {
        success: false,
        message: "No puedes mover una categoría bajo un descendiente.",
      };
    }
  }

  try {
    await prisma.$transaction(
      items.map((item) =>
        prisma.category.update({
          where: { id: item.id },
          data: {
            parentId: item.parentId,
            sortOrder: item.sortOrder,
          },
        }),
      ),
    );
    revalidatePath("/admin/categories");
    revalidatePath("/admin/products");
    return { success: true, data: { updated: items.length } };
  } catch {
    return { success: false, message: "No se pudo guardar el orden." };
  }
}
