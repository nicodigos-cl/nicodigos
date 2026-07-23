"use server";

import { revalidatePath } from "next/cache";
import { flattenError } from "zod";
import { z } from "zod";

import { ProductStatus } from "@/generated/prisma/client";
import type { ActionResult } from "@/lib/actions/types";
import { requireSession } from "@/lib/auth/session";
import { evaluateChileCompatibility } from "@/lib/kinguin/chile-compatibility";
import {
  syncKinguinProductById,
  syncKinguinProductsByIds,
  type SyncKinguinProductResult,
} from "@/lib/kinguin/sync";
import prisma from "@/lib/prisma";
import {
  getProductsByIdsForBulk,
  getProductsForBulkQuery,
} from "@/lib/products/queries";
import { PRODUCT_PROCESS_LIMIT } from "@/lib/smm-services/constants";
import type { ImportProductItem } from "@/lib/validations/product-import";
import {
  bulkUpdateProductStatusSchema,
  bulkUpdateProductCoverSchema,
  bulkUpdateProductCategoriesSchema,
  bulkDeleteProductsSchema,
  bulkTranslateProductsSchema,
  checkProductsChileCompatibilitySchema,
  exportProductsSchema,
  selectProductsForQuerySchema,
  syncKinguinProductsSchema,
} from "@/lib/validations/products";
import { deleteImageFromR2 } from "@/lib/r2";
import {
  translateProductFieldsBulk,
  type ProductTranslateFields,
} from "@/lib/products/translate-fields";
import type { ProductListItemDto } from "@/types/products";
import pLimit from "p-limit";

function unauthorized<T>(): ActionResult<T> {
  return {
    success: false,
    message: "No autorizado. Inicia sesión para continuar.",
  };
}

function validationError<T>(
  error: Parameters<typeof flattenError>[0],
): ActionResult<T> {
  const flat = flattenError(error);
  return {
    success: false,
    message: "Revisa los campos del formulario.",
    fieldErrors: flat.fieldErrors,
  };
}

function toImportItem(product: ProductListItemDto): ImportProductItem {
  return {
    name: product.name,
    slug: product.slug,
    description: product.description ?? undefined,
    price: product.price,
    deliveryMethod: product.deliveryMethod,
    status: product.status,
    qty: product.qty,
    currency: product.currency,
    compareAtPrice: product.compareAtPrice ?? undefined,
    textQty: product.textQty ?? undefined,
    assets: [],
  };
}

export async function selectProductsForQueryAction(
  rawInput: unknown,
): Promise<ActionResult<{ items: ProductListItemDto[] }>> {
  const session = await requireSession();
  if (!session) {
    return unauthorized();
  }

  const parsed = selectProductsForQuerySchema.safeParse(rawInput);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const items = await getProductsForBulkQuery(
    parsed.data.query,
    parsed.data.limit,
  );

  return { success: true, data: { items } };
}

export async function bulkUpdateProductStatusAction(
  rawInput: unknown,
): Promise<ActionResult<{ updated: number; status: ProductStatus }>> {
  const session = await requireSession();
  if (!session) {
    return unauthorized();
  }

  const parsed = bulkUpdateProductStatusSchema.safeParse(rawInput);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  if (parsed.data.productIds.length > PRODUCT_PROCESS_LIMIT) {
    return {
      success: false,
      message: `Máximo ${PRODUCT_PROCESS_LIMIT} productos por operación.`,
    };
  }

  const result = await prisma.product.updateMany({
    where: { id: { in: parsed.data.productIds } },
    data: { status: parsed.data.status },
  });

  revalidatePath("/admin/products");

  return {
    success: true,
    data: { updated: result.count, status: parsed.data.status },
  };
}

export async function exportProductsAction(
  rawInput: unknown,
): Promise<ActionResult<{ items: ImportProductItem[] }>> {
  const session = await requireSession();
  if (!session) {
    return unauthorized();
  }

  const parsed = exportProductsSchema.safeParse(rawInput);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const products = parsed.data.productIds?.length
    ? await getProductsByIdsForBulk(parsed.data.productIds)
    : parsed.data.query
      ? await getProductsForBulkQuery(parsed.data.query, parsed.data.limit)
      : [];

  if (products.length === 0) {
    return {
      success: false,
      message: "No hay productos para exportar.",
    };
  }

  return {
    success: true,
    data: { items: products.map(toImportItem) },
  };
}

export type ChileCompatibilityCheckItem = {
  productId: string;
  name: string;
  deliveryMethod: string;
  compatible: boolean;
  warning: string | null;
  regionalLimitations: string | null;
};

export async function checkProductsChileCompatibilityAction(
  rawInput: unknown,
): Promise<
  ActionResult<{
    checked: number;
    incompatible: ChileCompatibilityCheckItem[];
    compatibleCount: number;
  }>
> {
  const session = await requireSession();
  if (!session) {
    return unauthorized();
  }

  const parsed = checkProductsChileCompatibilitySchema.safeParse(rawInput);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const products = await prisma.product.findMany({
    where: { id: { in: parsed.data.productIds } },
    select: {
      id: true,
      name: true,
      deliveryMethod: true,
      regionalLimitations: true,
      countryLimitation: true,
    },
  });

  const incompatible: ChileCompatibilityCheckItem[] = [];
  let compatibleCount = 0;

  for (const product of products) {
    const chile = evaluateChileCompatibility({
      name: product.name,
      regionalLimitations: product.regionalLimitations,
      countryLimitation: product.countryLimitation,
    });
    if (chile.compatible) {
      compatibleCount += 1;
    } else {
      incompatible.push({
        productId: product.id,
        name: product.name,
        deliveryMethod: product.deliveryMethod,
        compatible: false,
        warning: chile.warning,
        regionalLimitations: product.regionalLimitations,
      });
    }
  }

  return {
    success: true,
    data: {
      checked: products.length,
      incompatible,
      compatibleCount,
    },
  };
}

export async function syncKinguinProductsAction(
  rawInput: unknown,
): Promise<
  ActionResult<{
    results: SyncKinguinProductResult[];
    totals: {
      synced: number;
      archived: number;
      errors: number;
      skipped: number;
      repriced: number;
    };
  }>
> {
  const session = await requireSession();
  if (!session) {
    return unauthorized();
  }

  const parsed = syncKinguinProductsSchema.safeParse(rawInput);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const result = await syncKinguinProductsByIds(parsed.data.productIds);

  for (const productId of parsed.data.productIds) {
    revalidatePath(`/admin/products/${productId}`);
  }
  revalidatePath("/admin/products");

  return {
    success: true,
    data: {
      results: result.results,
      totals: result.totals,
    },
  };
}

const syncOneProductSchema = z.object({
  productId: z.string().cuid(),
});

export async function syncKinguinProductAction(
  rawInput: unknown,
): Promise<ActionResult<SyncKinguinProductResult>> {
  const session = await requireSession();
  if (!session) {
    return unauthorized();
  }

  const parsed = syncOneProductSchema.safeParse(rawInput);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const result = await syncKinguinProductById(parsed.data.productId);
  if (result.status === "error") {
    return {
      success: false,
      message: result.error ?? "No se pudo sincronizar con Kinguin.",
    };
  }
  if (result.status === "skipped") {
    return {
      success: false,
      message: result.error ?? "Producto no enlazado a Kinguin.",
    };
  }

  revalidatePath(`/admin/products/${parsed.data.productId}`);
  revalidatePath("/admin/products");

  return { success: true, data: result };
}


export async function bulkUpdateProductCategoriesAction(
  rawInput: unknown,
): Promise<ActionResult<{ updated: number; categoryCount: number }>> {
  const session = await requireSession();
  if (!session) {
    return unauthorized();
  }

  const parsed = bulkUpdateProductCategoriesSchema.safeParse(rawInput);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const { productIds, categoryIds } = parsed.data;

  if (productIds.length > PRODUCT_PROCESS_LIMIT) {
    return {
      success: false,
      message: `Máximo ${PRODUCT_PROCESS_LIMIT} productos por operación.`,
    };
  }

  const existing = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true },
  });
  if (existing.length === 0) {
    return { success: false, message: "No se encontraron productos." };
  }

  if (categoryIds.length > 0) {
    const categories = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true },
    });
    if (categories.length !== categoryIds.length) {
      return {
        success: false,
        message: "Una o más categorías no existen.",
        fieldErrors: { categoryIds: ["Categoría inválida"] },
      };
    }
  }

  const ids = existing.map((item) => item.id);

  await prisma.$transaction(async (tx) => {
    await tx.productCategory.deleteMany({
      where: { productId: { in: ids } },
    });

    if (categoryIds.length > 0) {
      await tx.productCategory.createMany({
        data: ids.flatMap((productId) =>
          categoryIds.map((categoryId) => ({ productId, categoryId })),
        ),
      });
    }
  });

  revalidatePath("/admin/products");

  return {
    success: true,
    data: { updated: ids.length, categoryCount: categoryIds.length },
  };
}

export async function bulkUpdateProductCoverAction(
  rawInput: unknown,
): Promise<ActionResult<{ updated: number }>> {
  const session = await requireSession();
  if (!session) {
    return unauthorized();
  }

  const parsed = bulkUpdateProductCoverSchema.safeParse(rawInput);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const {
    productIds,
    coverImageUrl,
    objectKey,
    mimeType,
    fileName,
    sizeBytes,
  } = parsed.data;

  const existing = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true },
  });
  if (existing.length === 0) {
    return { success: false, message: "No se encontraron productos." };
  }

  const ids = existing.map((item) => item.id);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.product.updateMany({
        where: { id: { in: ids } },
        data: { coverImageUrl },
      });

      await tx.asset.updateMany({
        where: { productId: { in: ids }, type: "IMAGE", isCover: true },
        data: { isCover: false },
      });

      // objectKey is globally unique — only one Asset row may own the R2 key.
      // Other products share the public URL without claiming ownership.
      const keyAlreadyTaken = objectKey
        ? Boolean(
            await tx.asset.findUnique({
              where: { objectKey },
              select: { id: true },
            }),
          )
        : false;
      const ownerProductId =
        objectKey && !keyAlreadyTaken ? ids[0] : undefined;

      const limit = pLimit(8);

      await Promise.all(
        ids.map((productId) =>
          limit(async () => {
            const maxSort = await tx.asset.aggregate({
              where: { productId },
              _max: { sortOrder: true },
            });

            await tx.asset.create({
              data: {
                productId,
                type: "IMAGE",
                url: coverImageUrl,
                objectKey:
                  ownerProductId != null && productId === ownerProductId
                    ? objectKey
                    : null,
                mimeType: mimeType ?? null,
                fileName: fileName ?? null,
                sizeBytes: sizeBytes != null ? BigInt(sizeBytes) : null,
                sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
                isCover: true,
              },
            });
          }),
        ),
      );
    });
  } catch {
    return {
      success: false,
      message: "No se pudo aplicar la portada a los productos.",
    };
  }

  // Use concurrency when revalidating product paths, in case of many products
  ids.forEach((productId) => revalidatePath(`/admin/products/${productId}`));
  revalidatePath("/admin/products");

  return { success: true, data: { updated: ids.length } };
}

export async function bulkDeleteProductsAction(
  rawInput: unknown,
): Promise<
  ActionResult<{
    deleted: number;
    skipped: Array<{ productId: string; name: string; reason: string }>;
  }>
> {
  const session = await requireSession();
  if (!session) {
    return unauthorized();
  }

  const parsed = bulkDeleteProductsSchema.safeParse(rawInput);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const products = await prisma.product.findMany({
    where: { id: { in: parsed.data.productIds } },
    select: {
      id: true,
      name: true,
      _count: { select: { orderItems: true } },
      assets: { select: { objectKey: true } },
    },
  });

  const skipped: Array<{ productId: string; name: string; reason: string }> =
    [];
  const toDelete: typeof products = [];

  for (const product of products) {
    if (product._count.orderItems > 0) {
      skipped.push({
        productId: product.id,
        name: product.name,
        reason: "tiene ventas",
      });
      continue;
    }
    toDelete.push(product);
  }

  const objectKeys = toDelete.flatMap((product) =>
    product.assets
      .map((asset) => asset.objectKey)
      .filter((key): key is string => Boolean(key)),
  );

  if (toDelete.length > 0) {
    await prisma.product.deleteMany({
      where: { id: { in: toDelete.map((item) => item.id) } },
    });
    await Promise.all(
      objectKeys.map((key) => deleteImageFromR2(key).catch(() => undefined)),
    );
  }

  revalidatePath("/admin/products");

  return {
    success: true,
    data: {
      deleted: toDelete.length,
      skipped,
    },
  };
}

function csvOrJoin(values: string[]): string {
  return values.filter(Boolean).join(", ");
}

function splitCsv(value: string | undefined): string[] {
  if (!value?.trim()) return [];
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function bulkTranslateProductsAction(
  rawInput: unknown,
): Promise<
  ActionResult<{
    updated: number;
    skipped: number;
    failed: Array<{ productId: string; name: string; message: string }>;
  }>
> {
  const session = await requireSession();
  if (!session) {
    return unauthorized();
  }

  const parsed = bulkTranslateProductsSchema.safeParse(rawInput);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const products = await prisma.product.findMany({
    where: { id: { in: parsed.data.productIds } },
    select: {
      id: true,
      name: true,
      description: true,
      platform: true,
      regionalLimitations: true,
      activationDetails: true,
      genres: true,
      languages: true,
    },
  });

  const items = products.map((product) => ({
    productId: product.id,
    fields: {
      name: product.name,
      description: product.description ?? "",
      platform: product.platform ?? "",
      regionalLimitations: product.regionalLimitations ?? "",
      activationDetails: product.activationDetails ?? "",
      genres: csvOrJoin(product.genres),
      languages: csvOrJoin(product.languages),
    } satisfies ProductTranslateFields,
  }));

  let translatedById: Map<string, ProductTranslateFields>;
  try {
    translatedById = await translateProductFieldsBulk(items, {
      only: parsed.data.only,
      force: parsed.data.force,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message.slice(0, 300) : "Error de traducción";
    return { success: false, message };
  }

  let updated = 0;
  let skipped = 0;
  const failed: Array<{ productId: string; name: string; message: string }> =
    [];

  for (const product of products) {
    const translated = translatedById.get(product.id);
    if (!translated || Object.keys(translated).length === 0) {
      skipped += 1;
      continue;
    }

    try {
      await prisma.product.update({
        where: { id: product.id },
        data: {
          ...(translated.name != null ? { name: translated.name } : {}),
          ...(translated.description != null
            ? { description: translated.description }
            : {}),
          ...(translated.platform != null
            ? { platform: translated.platform }
            : {}),
          ...(translated.regionalLimitations != null
            ? { regionalLimitations: translated.regionalLimitations }
            : {}),
          ...(translated.activationDetails != null
            ? { activationDetails: translated.activationDetails }
            : {}),
          ...(translated.genres != null
            ? { genres: splitCsv(translated.genres) }
            : {}),
          ...(translated.languages != null
            ? { languages: splitCsv(translated.languages) }
            : {}),
        },
      });
      updated += 1;
      revalidatePath(`/admin/products/${product.id}`);
    } catch (error) {
      failed.push({
        productId: product.id,
        name: product.name,
        message:
          error instanceof Error
            ? error.message.slice(0, 200)
            : "No se pudo guardar",
      });
    }
  }

  revalidatePath("/admin/products");

  return {
    success: true,
    data: { updated, skipped, failed },
  };
}
