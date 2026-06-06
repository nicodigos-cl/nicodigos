"use server";

import { revalidatePath } from "next/cache";
import { storeRoutes } from "@/lib/store/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { getEurToClpRate } from "@/lib/currency/exchange";
import { mapKinguinProductMetadata } from "@/lib/admin/products/kinguin-metadata";
import { mapKinguinProductToCreateInput } from "@/lib/admin/products/map-kinguin";
import { replaceProductImages } from "@/lib/admin/products/persist-images";
import { replaceProductVideos } from "@/lib/admin/products/persist-videos";
import { syncProductClpFromSourceIfNeeded } from "@/lib/admin/products/sync-clp";
import { ProductImageSource } from "@/lib/generated/prisma/client";
import { isR2Configured } from "@/lib/r2/env";
import { uploadProductImageToR2 } from "@/lib/r2/upload-product-image";
import { updateProductSchema } from "@/lib/admin/products/schemas";
import type { UpdateProductInput } from "@/lib/admin/products/schemas";
import { getImportedKinguinIds } from "@/lib/admin/products/queries";
import { resolveImportProductSlug } from "@/lib/admin/products/slug";
import {
  formatKinguinError,
  searchKinguinProductsByName,
} from "@/lib/admin/products/kinguin-search";
import type {
  AdminProductActionResult,
  BulkKinguinImportItem,
  BulkKinguinImportPayload,
  KinguinSearchPayload,
  KinguinSearchResultItem,
} from "@/lib/admin/products/types";
import { getKinguinSdk, isKinguinConfigured } from "@/lib/kinguin/client";
import { resolveKinguinProductCoverUrl } from "@/lib/kinguin/product-images";
import { Prisma } from "@/lib/generated/prisma/client";
import prisma from "@/lib/prisma";
import type { KinguinProduct } from "@/types/kinguin";
import { isOpenAIConfigured } from "@/lib/openai/env";
import { translateAndImproveKinguinProduct } from "@/lib/admin/products/kinguin-translate";

const MIN_SEARCH_LENGTH = 3;
const BULK_IMPORT_CONCURRENCY = 3;
const BULK_IMPORT_AI_CONCURRENCY = 2;
const BULK_IMPORT_BATCH_SIZE = 100;
const BULK_IMPORT_BATCH_CONCURRENCY = 2;

function kinguinNotConfiguredError(): AdminProductActionResult<never> {
  return {
    success: false,
    error:
      "La API de Kinguin no está configurada. Añade KINGUIN_API_KEY y KINGUIN_API_BASE en el entorno.",
  };
}

function mapSearchResult(
  product: KinguinProduct,
  imported: { kinguinIds: Set<number>; productIds: Set<string> },
): KinguinSearchResultItem {
  return {
    kinguinId: product.kinguinId,
    productId: product.productId,
    name: product.name,
    platform: product.platform,
    price: product.price,
    qty: product.qty,
    coverImageUrl: resolveKinguinProductCoverUrl(product),
    isPreorder: product.isPreorder,
    alreadyImported:
      imported.kinguinIds.has(product.kinguinId) ||
      imported.productIds.has(product.productId),
  };
}

function revalidateProductImportPaths(product?: { id: string }) {
  revalidatePath("/admin/products");
  if (product) {
    revalidatePath(`/admin/products/${product.id}/edit`);
  }
  revalidatePath("/admin");
}

async function importKinguinProduct(
  kinguinProductId: string,
  options?: { translateWithAi?: boolean; slug?: string },
): Promise<AdminProductActionResult<{ productId: string; slug: string }>> {
  if (!isKinguinConfigured()) {
    return kinguinNotConfiguredError();
  }

  const productId = kinguinProductId.trim();
  if (!productId) {
    return { success: false, error: "Selecciona un producto de Kinguin." };
  }

  const existing = await prisma.product.findUnique({
    where: { kinguinProductId: productId },
    select: { id: true, slug: true },
  });

  if (existing) {
    return {
      success: false,
      error: "Este producto ya está en el catálogo local.",
    };
  }

  try {
    const kinguin = getKinguinSdk();
    const kinguinProduct = await kinguin.getProduct(productId);

    let name = kinguinProduct.name;
    let description = kinguinProduct.description ?? null;
    let activationDetails = kinguinProduct.activationDetails?.trim() || null;

    if (options?.translateWithAi) {
      if (!isOpenAIConfigured()) {
        return {
          success: false,
          error:
            "OpenAI no está configurado. Configura OPENAI_API_KEY en el servidor.",
        };
      }
      try {
        const translated = await translateAndImproveKinguinProduct(
          kinguinProduct.name,
          kinguinProduct.platform,
          kinguinProduct.description ?? null,
          kinguinProduct.activationDetails ?? null,
        );
        name = translated.name;
        description = translated.description;
        activationDetails = translated.activationDetails;
      } catch (err) {
        return {
          success: false,
          error: `Error al traducir con IA: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    }

    const slugResult = await resolveImportProductSlug(name, options?.slug);
    if ("error" in slugResult) {
      return { success: false, error: slugResult.error };
    }
    const slug = slugResult.slug;
    const { rate } = await getEurToClpRate();

    const modifiedProduct = {
      ...kinguinProduct,
      name,
      description: description ?? undefined,
      activationDetails: activationDetails ?? "",
    };

    const metadata = await mapKinguinProductMetadata(modifiedProduct);
    metadata.activationDetails = activationDetails;

    const productData = mapKinguinProductToCreateInput(
      modifiedProduct,
      slug,
      rate,
      metadata,
    );

    const duplicateByKinguinId = await prisma.product.findUnique({
      where: { kinguinId: kinguinProduct.kinguinId },
      select: { id: true },
    });

    if (duplicateByKinguinId) {
      return {
        success: false,
        error: "Este producto de Kinguin ya está importado.",
      };
    }

    const created = await prisma.product.create({
      data: productData,
      select: { id: true, slug: true },
    });

    await syncProductClpFromSourceIfNeeded(created.id, rate);

    return {
      success: true,
      data: { productId: created.id, slug: created.slug },
      message:
        "Producto importado como borrador. Revisa precios en CLP y publícalo desde edición.",
    };
  } catch (error) {
    return { success: false, error: formatKinguinError(error) };
  }
}

async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
) {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await worker(items[currentIndex]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () =>
      runWorker(),
    ),
  );

  return results;
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function normalizeBulkImportItems(items: BulkKinguinImportItem[]) {
  const seen = new Set<string>();
  const normalized: BulkKinguinImportItem[] = [];

  for (const item of items) {
    const productId = item.productId.trim();
    if (!productId || seen.has(productId)) continue;
    seen.add(productId);
    normalized.push({
      productId,
      name: item.name?.trim() || productId,
      slug: item.slug?.trim() || undefined,
    });
  }

  return normalized;
}

export async function searchKinguinProductsAction(
  name: string,
  options?: { page?: number },
): Promise<AdminProductActionResult<KinguinSearchPayload>> {
  await requireAdmin();

  if (!isKinguinConfigured()) {
    return kinguinNotConfiguredError();
  }

  const query = name.trim();
  if (query.length < MIN_SEARCH_LENGTH) {
    return {
      success: false,
      error: `Escribe al menos ${MIN_SEARCH_LENGTH} caracteres para buscar.`,
    };
  }

  try {
    const result = await searchKinguinProductsByName(query, {
      page: options?.page,
    });
    const { products, fromCache } = result;
    const imported = await getImportedKinguinIds(
      products.map((item) => item.kinguinId),
      products.map((item) => item.productId),
    );

    const items = products.map((item) => mapSearchResult(item, imported));

    return {
      success: true,
      data: {
        items,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        limit: result.limit,
        fromCache,
        searchMode: result.searchMode,
        truncated: result.truncated,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: formatKinguinError(error),
    };
  }
}

export async function importKinguinProductAction(
  kinguinProductId: string,
  options?: { translateWithAi?: boolean; slug?: string },
): Promise<AdminProductActionResult<{ productId: string; slug: string }>> {
  await requireAdmin();

  const result = await importKinguinProduct(kinguinProductId, options);
  if (result.success) {
    revalidateProductImportPaths({ id: result.data.productId });
  }

  return result;
}

export async function bulkImportKinguinProductsAction(
  items: BulkKinguinImportItem[],
  options?: { translateWithAi?: boolean },
): Promise<AdminProductActionResult<BulkKinguinImportPayload>> {
  await requireAdmin();

  if (!isKinguinConfigured()) {
    return kinguinNotConfiguredError();
  }

  const normalizedItems = normalizeBulkImportItems(items);
  if (normalizedItems.length === 0) {
    return {
      success: false,
      error: "Selecciona al menos un producto de Kinguin.",
    };
  }

  const concurrency = options?.translateWithAi
    ? BULK_IMPORT_AI_CONCURRENCY
    : BULK_IMPORT_CONCURRENCY;
  const batches = chunkArray(normalizedItems, BULK_IMPORT_BATCH_SIZE);
  const batchConcurrency = Math.min(
    BULK_IMPORT_BATCH_CONCURRENCY,
    batches.length,
  );

  const batchResults = await runWithConcurrency(
    batches,
    batchConcurrency,
    async (batch) => {
      return runWithConcurrency(batch, concurrency, async (item) => {
        const result = await importKinguinProduct(item.productId, {
          ...options,
          slug: item.slug,
        });

        if (!result.success) {
          return {
            success: false as const,
            id: item.productId,
            name: item.name || item.productId,
            error: result.error,
          };
        }

        return {
          success: true as const,
          kinguinProductId: item.productId,
          productId: result.data.productId,
          slug: result.data.slug,
        };
      });
    },
  );
  const results = batchResults.flat();

  const imported = results
    .filter((result) => result.success)
    .map((result) => ({
      kinguinProductId: result.kinguinProductId,
      productId: result.productId,
      slug: result.slug,
    }));

  const errors = results
    .filter((result) => !result.success)
    .map((result) => ({
      id: result.id,
      name: result.name,
      error: result.error,
    }));

  revalidateProductImportPaths();

  return {
    success: true,
    data: {
      requestedCount: normalizedItems.length,
      successCount: imported.length,
      concurrency,
      batchSize: BULK_IMPORT_BATCH_SIZE,
      batchCount: batches.length,
      batchConcurrency,
      imported,
      errors,
    },
    message:
      errors.length > 0
        ? `Se importaron ${imported.length} productos. ${errors.length} fallaron.`
        : `Se importaron ${imported.length} productos.`,
  };
}

export async function updateProductAction(
  productId: string,
  input: UpdateProductInput,
): Promise<AdminProductActionResult<{ id: string }>> {
  await requireAdmin();

  const parsed = updateProductSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Datos inválidos";
    return { success: false, error: first };
  }

  const data = parsed.data;

  try {
    await prisma.product.update({
      where: { id: productId },
      data: {
        name: data.name,
        description: data.description || null,
        platform: data.platform,
        sellPrice: new Prisma.Decimal(data.sellPrice),
        costPrice: new Prisma.Decimal(data.costPrice),
        qty: data.qty,
        isActive: data.isActive,
        isOffer: data.isOffer,
        isFeatured: data.isFeatured,
        isPreorder: data.isPreorder,
        activationDetails: data.activationDetails || null,
        languages: data.languages,
        categories: {
          set: data.categoryIds.map((id) => ({ id })),
        },
        tags: data.tags,
        regionalLimitations: data.regionalLimitations || null,
        systemRequirements:
          data.systemRequirements.length > 0
            ? (data.systemRequirements as Prisma.InputJsonValue)
            : Prisma.DbNull,
      },
    });

    await replaceProductImages(
      productId,
      data.images.map((image) => ({
        url: image.url,
        thumbnailUrl: image.thumbnailUrl ?? image.url,
        sortOrder: image.sortOrder,
        isCover: image.isCover,
        source: ProductImageSource.MANUAL,
      })),
    );

    await replaceProductVideos(
      productId,
      data.videos.map((video) => ({
        youtubeVideoId: video.youtubeVideoId,
        title: video.title ?? null,
        sortOrder: video.sortOrder,
        source: ProductImageSource.MANUAL,
      })),
    );

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${productId}/edit`);
    revalidatePath(storeRoutes.offers);
    revalidatePath("/");

    return {
      success: true,
      data: { id: productId },
      message: "Producto actualizado.",
    };
  } catch {
    return { success: false, error: "No se pudo guardar el producto." };
  }
}

const UPLOAD_ERRORS: Record<string, string> = {
  R2_STORAGE_NOT_CONFIGURED:
    "El almacenamiento R2 no está configurado en el servidor.",
  FILE_TOO_LARGE: "La imagen no puede superar 5 MB.",
  FILE_TYPE_NOT_ALLOWED: "Solo se permiten JPG, PNG o WebP.",
};

export async function uploadProductImageAction(
  productId: string,
  formData: FormData,
): Promise<AdminProductActionResult<{ url: string }>> {
  await requireAdmin();

  if (!isR2Configured()) {
    return {
      success: false,
      error: UPLOAD_ERRORS.R2_STORAGE_NOT_CONFIGURED,
    };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "Selecciona una imagen." };
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });

  if (!product) {
    return { success: false, error: "Producto no encontrado." };
  }

  try {
    const url = await uploadProductImageToR2(productId, file);
    return { success: true, data: { url } };
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    return {
      success: false,
      error: UPLOAD_ERRORS[code] ?? "No se pudo subir la imagen.",
    };
  }
}

export async function bulkUpdateProductsAction(
  productIds: string[],
  data: {
    isActive?: boolean;
    isOffer?: boolean;
    isFeatured?: boolean;
    isPreorder?: boolean;
  },
): Promise<AdminProductActionResult> {
  await requireAdmin();

  if (!productIds || productIds.length === 0) {
    return { success: false, error: "No se seleccionaron productos." };
  }

  try {
    await prisma.product.updateMany({
      where: {
        id: { in: productIds },
      },
      data,
    });

    revalidatePath("/admin/products");
    revalidatePath("/");
    revalidatePath(storeRoutes.offers);

    return {
      success: true,
      data: undefined,
      message: `${productIds.length} productos actualizados.`,
    };
  } catch {
    return {
      success: false,
      error: "Error al realizar la actualización masiva.",
    };
  }
}

export async function bulkAssignProductsCategoryAction(
  productIds: string[],
  categoryId: string,
  options?: { replace?: boolean },
): Promise<AdminProductActionResult<{ updatedCount: number }>> {
  await requireAdmin();

  if (!productIds.length) {
    return { success: false, error: "No se seleccionaron productos." };
  }

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true, name: true, slug: true },
  });

  if (!category) {
    return { success: false, error: "Categoría no encontrada." };
  }

  const uniqueIds = [...new Set(productIds)];

  try {
    let updatedCount = 0;

    if (options?.replace) {
      await prisma.$transaction(
        uniqueIds.map((id) =>
          prisma.product.update({
            where: { id },
            data: {
              categories: { set: [{ id: categoryId }] },
            },
          }),
        ),
      );
      updatedCount = uniqueIds.length;
    } else {
      const products = await prisma.product.findMany({
        where: { id: { in: uniqueIds } },
        select: { id: true, categories: { select: { id: true } } },
      });

      const toConnect = products.filter(
        (product) => !product.categories.some((item) => item.id === categoryId),
      );

      if (toConnect.length > 0) {
        await prisma.$transaction(
          toConnect.map((product) =>
            prisma.product.update({
              where: { id: product.id },
              data: { categories: { connect: { id: categoryId } } },
            }),
          ),
        );
      }

      updatedCount = toConnect.length;
    }

    revalidatePath("/admin/products");
    revalidatePath("/");
    revalidatePath(storeRoutes.offers);
    revalidatePath(storeRoutes.category(category.slug));

    const skippedCount = uniqueIds.length - updatedCount;
    const message = options?.replace
      ? `${uniqueIds.length} producto${uniqueIds.length === 1 ? "" : "s"} asignado${uniqueIds.length === 1 ? "" : "s"} a «${category.name}».`
      : updatedCount === 0
        ? `Los productos seleccionados ya estaban en «${category.name}».`
        : skippedCount > 0
          ? `${updatedCount} producto${updatedCount === 1 ? "" : "s"} añadido${updatedCount === 1 ? "" : "s"} a «${category.name}» (${skippedCount} ya estaban en la categoría).`
          : `${updatedCount} producto${updatedCount === 1 ? "" : "s"} añadido${updatedCount === 1 ? "" : "s"} a «${category.name}».`;

    return {
      success: true,
      data: { updatedCount },
      message,
    };
  } catch {
    return {
      success: false,
      error: "No se pudo asignar la categoría a los productos seleccionados.",
    };
  }
}
