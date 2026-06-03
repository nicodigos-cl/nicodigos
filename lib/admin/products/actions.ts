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
import { uniqueProductSlug } from "@/lib/admin/products/slug";
import {
  fetchAllKinguinProductsByName,
  formatKinguinError,
} from "@/lib/admin/products/kinguin-search";
import type {
  AdminProductActionResult,
  KinguinSearchPayload,
  KinguinSearchResultItem,
} from "@/lib/admin/products/types";
import { getKinguinSdk, isKinguinConfigured } from "@/lib/kinguin/client";
import { resolveKinguinProductCoverUrl } from "@/lib/kinguin/product-images";
import { Prisma } from "@/lib/generated/prisma/client";
import prisma from "@/lib/prisma";
import type { KinguinProduct } from "@/types/kinguin";

const MIN_SEARCH_LENGTH = 3;

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

export async function searchKinguinProductsAction(
  name: string,
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
    const result = await fetchAllKinguinProductsByName(query);
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
        total: items.length,
        fromCache,
        searchMode: result.searchMode,
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
): Promise<AdminProductActionResult<{ productId: string; slug: string }>> {
  await requireAdmin();

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
    const slug = await uniqueProductSlug(kinguinProduct.name);
    const { rate } = await getEurToClpRate();
    const metadata = await mapKinguinProductMetadata(kinguinProduct);
    const productData = mapKinguinProductToCreateInput(
      kinguinProduct,
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

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${created.id}/edit`);
    revalidatePath("/admin");

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
        isPreorder: data.isPreorder,
        activationDetails: data.activationDetails || null,
        countryLimitations: data.countryLimitations,
        languages: data.languages,
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
