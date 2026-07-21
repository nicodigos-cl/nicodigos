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
  checkProductsChileCompatibilitySchema,
  exportProductsSchema,
  selectProductsForQuerySchema,
  syncKinguinProductsSchema,
} from "@/lib/validations/products";
import type { ProductListItemDto } from "@/types/products";

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
