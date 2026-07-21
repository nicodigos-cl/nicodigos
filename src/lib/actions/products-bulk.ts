"use server";

import { revalidatePath } from "next/cache";
import { flattenError } from "zod";

import { ProductStatus } from "@/generated/prisma/client";
import type { ActionResult } from "@/lib/actions/types";
import { requireSession } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import {
  getProductsByIdsForBulk,
  getProductsForBulkQuery,
} from "@/lib/products/queries";
import { PRODUCT_PROCESS_LIMIT } from "@/lib/smm-services/constants";
import type { ImportProductItem } from "@/lib/validations/product-import";
import {
  bulkUpdateProductStatusSchema,
  exportProductsSchema,
  selectProductsForQuerySchema,
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
