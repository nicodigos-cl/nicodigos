"use server";

import { revalidatePath } from "next/cache";
import { flattenError } from "zod";

import { Prisma, ProductKeyStatus, DeliveryMethod } from "@/generated/prisma/client";
import type { ActionResult } from "@/lib/actions/types";
import { requireSession } from "@/lib/auth/session";
import {
  resolveKinguinLinkPayload,
  writeKinguinRelatedRecords,
} from "@/lib/kinguin/import";
import prisma from "@/lib/prisma";
import { DEFAULT_KINGUIN_MARKUP_PCT, DEFAULT_MARKUP_MIN_PCT } from "@/lib/smm-services/constants";
import {
  addProductImageSchema,
  addProductKeysSchema,
  archiveProductSchema,
  createProductSchema,
  removeProductImageSchema,
  reorderProductImagesSchema,
  revokeProductKeySchema,
  setCoverImageSchema,
  updateProductSchema,
} from "@/lib/validations/products";

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

function parseReleaseDate(value: string | null | undefined): Date | null {
  if (value == null || value === "") {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeOfferFields(input: {
  isOffer: boolean;
  price: string;
  compareAtPrice?: string | null;
}) {
  if (!input.isOffer) {
    return {
      price: input.price,
      compareAtPrice: null as string | null,
      isOffer: false,
    };
  }

  return {
    price: input.price,
    compareAtPrice: input.compareAtPrice ?? null,
    isOffer: true,
  };
}

async function syncProductCategories(
  tx: Prisma.TransactionClient,
  productId: string,
  categoryIds: string[],
) {
  if (categoryIds.length > 0) {
    const existing = await tx.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true },
    });

    if (existing.length !== categoryIds.length) {
      throw new Error("CATEGORY_NOT_FOUND");
    }
  }

  await tx.productCategory.deleteMany({ where: { productId } });

  if (categoryIds.length > 0) {
    await tx.productCategory.createMany({
      data: categoryIds.map((categoryId) => ({
        productId,
        categoryId,
      })),
    });
  }
}

async function resolveSmmLinkFields(input: {
  deliveryMethod: DeliveryMethod;
  smmServiceDbId?: string;
  textQty?: number | null;
}) {
  if (input.deliveryMethod !== DeliveryMethod.SMM || !input.smmServiceDbId) {
    return null;
  }

  const service = await prisma.smmService.findUnique({
    where: { id: input.smmServiceDbId },
    select: {
      remoteServiceId: true,
      name: true,
      type: true,
      category: true,
      rate: true,
      min: true,
      max: true,
      refill: true,
      cancel: true,
      provider: { select: { apiUrl: true } },
    },
  });

  if (!service) {
    throw new Error("SMM_SERVICE_NOT_FOUND");
  }

  return {
    smmApiUrl: service.provider.apiUrl,
    smmServiceId: service.remoteServiceId,
    smmServiceType: service.type,
    smmCategory: service.category,
    smmRate: service.rate,
    smmMarkupPct: DEFAULT_MARKUP_MIN_PCT,
    smmMin: service.min,
    smmMax: service.max,
    smmRefill: service.refill,
    smmCancel: service.cancel,
    smmServiceName: service.name,
    smmSyncedAt: new Date(),
    textQty: input.textQty ?? service.min,
  };
}

export async function createProductAction(
  rawInput: unknown,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession();
  if (!session) {
    return unauthorized();
  }

  const parsed = createProductSchema.safeParse(rawInput);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const data = parsed.data;
  const pricing = normalizeOfferFields(data);

  try {
    const smmFields = await resolveSmmLinkFields({
      deliveryMethod: data.deliveryMethod,
      smmServiceDbId: data.smmServiceDbId,
      textQty: data.textQty,
    });

    const kinguinLink =
      data.deliveryMethod === DeliveryMethod.KINGUIN && data.kinguinId != null
        ? await resolveKinguinLinkPayload(data.kinguinId)
        : null;

    const kinguinMarkupPct =
      data.kinguinMarkupPct ?? DEFAULT_KINGUIN_MARKUP_PCT;

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name: data.name,
          slug: data.slug,
          description: data.description ?? null,
          coverImageUrl:
            data.coverImageUrl ?? kinguinLink?.meta.coverImageUrl ?? null,
          status: data.status,
          deliveryMethod: data.deliveryMethod,
          price: pricing.price,
          compareAtPrice: pricing.compareAtPrice,
          currency: data.currency.toUpperCase(),
          qty: kinguinLink?.availableQty ?? data.qty,
          textQty:
            smmFields?.textQty ??
            (kinguinLink
              ? (kinguinLink.cheapest.textQty ??
                kinguinLink.cheapest.availableTextQty ??
                null)
              : data.textQty ?? null),
          isFeatured: data.isFeatured,
          isOffer: pricing.isOffer,
          isPreorder: data.isPreorder || Boolean(kinguinLink?.meta.isPreorder),
          regionId: data.regionId ?? kinguinLink?.meta.regionId ?? null,
          regionalLimitations:
            data.regionalLimitations ??
            kinguinLink?.meta.regionalLimitations ??
            null,
          countryLimitation:
            data.countryLimitation?.length
              ? data.countryLimitation
              : (kinguinLink?.meta.countryLimitation ?? []),
          activationDetails:
            data.activationDetails ??
            kinguinLink?.meta.activationDetails ??
            null,
          releaseDate:
            parseReleaseDate(data.releaseDate) ??
            kinguinLink?.meta.releaseDate ??
            null,
          ageRating: data.ageRating ?? kinguinLink?.meta.ageRating ?? null,
          platform: data.platform ?? kinguinLink?.meta.platform ?? null,
          genres: data.genres?.length
            ? data.genres
            : (kinguinLink?.meta.genres ?? []),
          languages: data.languages?.length
            ? data.languages
            : (kinguinLink?.meta.languages ?? []),
          developers: data.developers?.length
            ? data.developers
            : (kinguinLink?.meta.developers ?? []),
          publishers: data.publishers?.length
            ? data.publishers
            : (kinguinLink?.meta.publishers ?? []),
          tags: data.tags?.length ? data.tags : (kinguinLink?.meta.tags ?? []),
          originalName: kinguinLink?.meta.originalName ?? null,
          metacriticScore: kinguinLink?.meta.metacriticScore ?? null,
          sourceCostPrice:
            data.sourceCostPrice ??
            (kinguinLink ? String(kinguinLink.costClp) : null),
          ...(smmFields
            ? {
                smmApiUrl: smmFields.smmApiUrl,
                smmServiceId: smmFields.smmServiceId,
                smmServiceType: smmFields.smmServiceType,
                smmCategory: smmFields.smmCategory,
                smmRate: smmFields.smmRate,
                smmMarkupPct: smmFields.smmMarkupPct,
                smmMin: smmFields.smmMin,
                smmMax: smmFields.smmMax,
                smmRefill: smmFields.smmRefill,
                smmCancel: smmFields.smmCancel,
                smmServiceName: smmFields.smmServiceName,
                smmSyncedAt: smmFields.smmSyncedAt,
              }
            : {}),
          ...(kinguinLink
            ? {
                kinguinId: kinguinLink.remote.kinguinId,
                kinguinProductId: kinguinLink.remote.productId,
                kinguinOfferId: kinguinLink.cheapest.offerId,
                kinguinMarkupPct,
                kinguinSyncedAt: new Date(),
              }
            : {}),
        },
        select: { id: true },
      });

      await syncProductCategories(tx, created.id, data.categoryIds);

      if (kinguinLink) {
        await writeKinguinRelatedRecords(
          tx,
          created.id,
          kinguinLink.remote,
          kinguinLink.cheapest.offerId,
        );
      }

      return created;
    });

    revalidatePath("/admin/products");
    if (kinguinLink) {
      revalidatePath("/admin/kinguin");
    }
    return { success: true, data: { id: product.id } };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        success: false,
        message: "Ya existe un producto con ese slug.",
        fieldErrors: { slug: ["Slug duplicado"] },
      };
    }

    if (error instanceof Error && error.message === "CATEGORY_NOT_FOUND") {
      return {
        success: false,
        message: "Una o más categorías no existen.",
        fieldErrors: { categoryIds: ["Categoría inválida"] },
      };
    }

    if (error instanceof Error && error.message === "SMM_SERVICE_NOT_FOUND") {
      return {
        success: false,
        message: "El servicio SMM seleccionado no existe.",
        fieldErrors: { smmServiceDbId: ["Servicio inválido"] },
      };
    }

    if (error instanceof Error && error.message === "KINGUIN_ALREADY_IMPORTED") {
      return {
        success: false,
        message: "Este producto Kinguin ya está importado.",
        fieldErrors: { kinguinId: ["Ya importado"] },
      };
    }

    if (error instanceof Error && error.message === "KINGUIN_PRODUCT_NOT_FOUND") {
      return {
        success: false,
        message: "Producto no encontrado en Kinguin.",
        fieldErrors: { kinguinId: ["No encontrado"] },
      };
    }

    if (error instanceof Error && error.message === "KINGUIN_NO_OFFERS") {
      return {
        success: false,
        message: "El producto Kinguin no tiene ofertas disponibles.",
        fieldErrors: { kinguinId: ["Sin ofertas"] },
      };
    }

    return {
      success: false,
      message: "No se pudo crear el producto.",
    };
  }
}

export async function updateProductAction(
  rawInput: unknown,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession();
  if (!session) {
    return unauthorized();
  }

  const parsed = updateProductSchema.safeParse(rawInput);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const data = parsed.data;
  const pricing = normalizeOfferFields(data);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: data.id },
        data: {
          name: data.name,
          slug: data.slug,
          description: data.description ?? null,
          coverImageUrl: data.coverImageUrl ?? null,
          status: data.status,
          deliveryMethod: data.deliveryMethod,
          price: pricing.price,
          compareAtPrice: pricing.compareAtPrice,
          currency: data.currency.toUpperCase(),
          qty: data.qty,
          textQty: data.textQty ?? null,
          isFeatured: data.isFeatured,
          isOffer: pricing.isOffer,
          isPreorder: data.isPreorder,
          regionId: data.regionId ?? null,
          regionalLimitations: data.regionalLimitations ?? null,
          countryLimitation: data.countryLimitation ?? [],
          activationDetails: data.activationDetails ?? null,
          releaseDate: parseReleaseDate(data.releaseDate),
          ageRating: data.ageRating ?? null,
          platform: data.platform ?? null,
          genres: data.genres ?? [],
          languages: data.languages ?? [],
          developers: data.developers ?? [],
          publishers: data.publishers ?? [],
          tags: data.tags ?? [],
          sourceCostPrice: data.sourceCostPrice ?? null,
        },
      });

      await syncProductCategories(tx, data.id, data.categoryIds);
    });

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${data.id}`);
    return { success: true, data: { id: data.id } };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return { success: false, message: "Producto no encontrado." };
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        success: false,
        message: "Ya existe un producto con ese slug.",
        fieldErrors: { slug: ["Slug duplicado"] },
      };
    }

    if (error instanceof Error && error.message === "CATEGORY_NOT_FOUND") {
      return {
        success: false,
        message: "Una o más categorías no existen.",
        fieldErrors: { categoryIds: ["Categoría inválida"] },
      };
    }

    return {
      success: false,
      message: "No se pudo actualizar el producto.",
    };
  }
}

export async function archiveProductAction(
  rawInput: unknown,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession();
  if (!session) {
    return unauthorized();
  }

  const parsed = archiveProductSchema.safeParse(rawInput);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  try {
    const product = await prisma.product.update({
      where: { id: parsed.data.id },
      data: { status: "ARCHIVED" },
      select: { id: true },
    });

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${product.id}`);
    return { success: true, data: { id: product.id } };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return { success: false, message: "Producto no encontrado." };
    }

    return {
      success: false,
      message: "No se pudo archivar el producto.",
    };
  }
}

function normalizeKeyCodes(codesText: string): {
  unique: string[];
  duplicatesInBatch: number;
  emptyLines: number;
} {
  const lines = codesText.split(/\r?\n/);
  let emptyLines = 0;
  const trimmed: string[] = [];

  for (const line of lines) {
    const code = line.trim();
    if (!code) {
      emptyLines += 1;
      continue;
    }
    trimmed.push(code);
  }

  const seen = new Set<string>();
  const unique: string[] = [];
  let duplicatesInBatch = 0;

  for (const code of trimmed) {
    const key = code.toLowerCase();
    if (seen.has(key)) {
      duplicatesInBatch += 1;
      continue;
    }
    seen.add(key);
    unique.push(code);
  }

  return { unique, duplicatesInBatch, emptyLines };
}

export async function addProductKeysAction(
  rawInput: unknown,
): Promise<
  ActionResult<{ created: number; skipped: number; duplicatesInBatch: number }>
> {
  const session = await requireSession();
  if (!session) {
    return unauthorized();
  }

  const parsed = addProductKeysSchema.safeParse(rawInput);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const { productId, codesText } = parsed.data;
  const { unique, duplicatesInBatch } = normalizeKeyCodes(codesText);

  if (unique.length === 0) {
    return {
      success: false,
      message: "No hay keys válidas para importar.",
    };
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });

  if (!product) {
    return { success: false, message: "Producto no encontrado." };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.productKey.findMany({
        where: {
          productId,
          code: { in: unique },
        },
        select: { code: true },
      });

      const existingSet = new Set(
        existing.map((item) => item.code.toLowerCase()),
      );
      const toCreate = unique.filter(
        (code) => !existingSet.has(code.toLowerCase()),
      );

      if (toCreate.length > 0) {
        await tx.productKey.createMany({
          data: toCreate.map((code) => ({
            productId,
            code,
            status: ProductKeyStatus.AVAILABLE,
          })),
          skipDuplicates: true,
        });
      }

      return {
        created: toCreate.length,
        skipped: unique.length - toCreate.length,
        duplicatesInBatch,
      };
    });

    revalidatePath(`/admin/products/${productId}`);
    return { success: true, data: result };
  } catch {
    return {
      success: false,
      message: "No se pudieron agregar las keys.",
    };
  }
}

export async function revokeProductKeyAction(
  rawInput: unknown,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession();
  if (!session) {
    return unauthorized();
  }

  const parsed = revokeProductKeySchema.safeParse(rawInput);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const { productId, keyId } = parsed.data;

  const key = await prisma.productKey.findFirst({
    where: { id: keyId, productId },
    select: {
      id: true,
      status: true,
      orderItemId: true,
      _count: { select: { deliveryKeys: true } },
    },
  });

  if (!key) {
    return { success: false, message: "Key no encontrada." };
  }

  if (key.status === ProductKeyStatus.SOLD) {
    return {
      success: false,
      message: "No se puede revocar una key vendida desde esta acción.",
    };
  }

  if (key.status === ProductKeyStatus.REVOKED) {
    return { success: false, message: "La key ya está revocada." };
  }

  try {
    const updated = await prisma.productKey.update({
      where: { id: key.id },
      data: { status: ProductKeyStatus.REVOKED },
      select: { id: true },
    });

    revalidatePath(`/admin/products/${productId}`);
    return { success: true, data: { id: updated.id } };
  } catch {
    return {
      success: false,
      message: "No se pudo revocar la key.",
    };
  }
}

export async function addProductImageAction(
  rawInput: unknown,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession();
  if (!session) {
    return unauthorized();
  }

  const parsed = addProductImageSchema.safeParse(rawInput);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const { productId, url, thumbnailUrl, setAsCover } = parsed.data;

  try {
    const image = await prisma.$transaction(async (tx) => {
      const maxSort = await tx.productImage.aggregate({
        where: { productId },
        _max: { sortOrder: true },
      });

      const created = await tx.productImage.create({
        data: {
          productId,
          url,
          thumbnailUrl: thumbnailUrl ?? null,
          sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
        },
        select: { id: true },
      });

      if (setAsCover) {
        await tx.product.update({
          where: { id: productId },
          data: { coverImageUrl: url },
        });
      }

      return created;
    });

    revalidatePath(`/admin/products/${productId}`);
    return { success: true, data: { id: image.id } };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return { success: false, message: "Producto no encontrado." };
    }

    return {
      success: false,
      message: "No se pudo agregar la imagen.",
    };
  }
}

export async function removeProductImageAction(
  rawInput: unknown,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession();
  if (!session) {
    return unauthorized();
  }

  const parsed = removeProductImageSchema.safeParse(rawInput);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const { productId, imageId } = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      const image = await tx.productImage.findFirst({
        where: { id: imageId, productId },
        select: { id: true, url: true },
      });

      if (!image) {
        throw new Error("IMAGE_NOT_FOUND");
      }

      const product = await tx.product.findUnique({
        where: { id: productId },
        select: { coverImageUrl: true },
      });

      await tx.productImage.delete({ where: { id: image.id } });

      if (product?.coverImageUrl === image.url) {
        const nextImage = await tx.productImage.findFirst({
          where: { productId },
          orderBy: { sortOrder: "asc" },
          select: { url: true },
        });

        await tx.product.update({
          where: { id: productId },
          data: { coverImageUrl: nextImage?.url ?? null },
        });
      }
    });

    revalidatePath(`/admin/products/${productId}`);
    return { success: true, data: { id: imageId } };
  } catch (error) {
    if (error instanceof Error && error.message === "IMAGE_NOT_FOUND") {
      return { success: false, message: "Imagen no encontrada." };
    }

    return {
      success: false,
      message: "No se pudo eliminar la imagen.",
    };
  }
}

export async function reorderProductImagesAction(
  rawInput: unknown,
): Promise<ActionResult<{ ids: string[] }>> {
  const session = await requireSession();
  if (!session) {
    return unauthorized();
  }

  const parsed = reorderProductImagesSchema.safeParse(rawInput);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const { productId, imageIds } = parsed.data;

  try {
    await prisma.$transaction(
      imageIds.map((imageId, index) =>
        prisma.productImage.updateMany({
          where: { id: imageId, productId },
          data: { sortOrder: index },
        }),
      ),
    );

    revalidatePath(`/admin/products/${productId}`);
    return { success: true, data: { ids: imageIds } };
  } catch {
    return {
      success: false,
      message: "No se pudo reordenar las imágenes.",
    };
  }
}

export async function setCoverImageAction(
  rawInput: unknown,
): Promise<ActionResult<{ coverImageUrl: string | null }>> {
  const session = await requireSession();
  if (!session) {
    return unauthorized();
  }

  const parsed = setCoverImageSchema.safeParse(rawInput);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const { productId, imageId, coverImageUrl } = parsed.data;

  try {
    let nextCover = coverImageUrl ?? null;

    if (imageId) {
      const image = await prisma.productImage.findFirst({
        where: { id: imageId, productId },
        select: { url: true },
      });

      if (!image) {
        return { success: false, message: "Imagen no encontrada." };
      }

      nextCover = image.url;
    }

    await prisma.product.update({
      where: { id: productId },
      data: { coverImageUrl: nextCover },
    });

    revalidatePath(`/admin/products/${productId}`);
    return { success: true, data: { coverImageUrl: nextCover } };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return { success: false, message: "Producto no encontrado." };
    }

    return {
      success: false,
      message: "No se pudo actualizar la imagen principal.",
    };
  }
}
