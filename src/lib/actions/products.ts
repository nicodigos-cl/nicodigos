"use server";

import { revalidatePath } from "next/cache";
import { flattenError } from "zod";

import {
  Prisma,
  ProductKeyStatus,
  DeliveryMethod,
  DeliveryContentType,
} from "@/generated/prisma/client";
import type { ActionResult } from "@/lib/actions/types";
import { requireSession } from "@/lib/auth/session";
import { encryptSecret } from "@/lib/crypto/secrets";
import {
  resolveKinguinLinkPayload,
  writeKinguinRelatedRecords,
} from "@/lib/kinguin/import";
import { mirrorKinguinProductImages } from "@/lib/kinguin/mirror-images";
import { invalidateKinguinSearchCache } from "@/lib/kinguin/search";
import { usdToClp } from "@/lib/fx/usd-clp";
import prisma from "@/lib/prisma";
import { deleteImageFromR2 } from "@/lib/r2";
import {
  DEFAULT_KINGUIN_MARKUP_PCT,
  DEFAULT_MARKUP_MIN_PCT,
} from "@/lib/smm-services/constants";
import {
  addProductImageSchema,
  addProductAccountsSchema,
  addProductKeysSchema,
  archiveProductSchema,
  createProductSchema,
  deleteProductSchema,
  removeProductImageSchema,
  reorderProductImagesSchema,
  revokeProductAccountSchema,
  revokeProductKeySchema,
  setCoverImageSchema,
  translateProductTextSchema,
  updateProductSchema,
} from "@/lib/validations/products";
import type { AssetInput } from "@/lib/validations/assets";
import {
  translateProductFields,
  type ProductTranslateFields,
} from "@/lib/products/translate-fields";

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

function parseSubmission(rawInput: unknown): unknown {
  if (!(rawInput instanceof FormData)) return rawInput;
  const payload = rawInput.get("payload");
  return typeof payload === "string" ? JSON.parse(payload) : null;
}

function assetCreateData(
  asset: AssetInput,
  owner: { productId?: string; categoryId?: string },
) {
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
    ...owner,
  };
}

function coverUrlFromAssets(assets: AssetInput[]): string | null {
  return (
    assets.find((asset) => asset.type === "IMAGE" && asset.isCover)?.url ??
    assets.find((asset) => asset.type === "IMAGE")?.url ??
    null
  );
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

  const rateUsd = Number.parseFloat(service.rate.toString());
  const sourceCostClp = Number.isFinite(rateUsd) ? await usdToClp(rateUsd) : 0;

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
    textQty: input.textQty ?? null,
    sourceCostClp,
  };
}

export async function createProductAction(
  rawInput: unknown,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession();
  if (!session) {
    return unauthorized();
  }

  let submission: unknown;
  try {
    submission = parseSubmission(rawInput);
  } catch {
    return {
      success: false,
      message: "Los datos del formulario son inválidos.",
    };
  }

  const parsed = createProductSchema.safeParse(submission);
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

    const mirroredImages = kinguinLink
      ? await mirrorKinguinProductImages(kinguinLink.remote)
      : null;

    const kinguinMarkupPct =
      data.kinguinMarkupPct ?? DEFAULT_KINGUIN_MARKUP_PCT;

    if (
      !coverUrlFromAssets(data.assets) &&
      !data.coverImageUrl &&
      !mirroredImages?.coverImageUrl
    ) {
      return {
        success: false,
        message: "Agrega una imagen principal al producto.",
        fieldErrors: { image: ["La imagen principal es obligatoria."] },
      };
    }

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name: data.name,
          slug: data.slug,
          description: data.description ?? null,
          coverImageUrl:
            coverUrlFromAssets(data.assets) ??
            data.coverImageUrl ??
            mirroredImages?.coverImageUrl ??
            null,
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
              : (data.textQty ?? null)),
          isFeatured: data.isFeatured,
          isOffer: pricing.isOffer,
          isPreorder: data.isPreorder || Boolean(kinguinLink?.meta.isPreorder),
          regionId: data.regionId ?? kinguinLink?.meta.regionId ?? null,
          regionalLimitations:
            data.regionalLimitations ??
            kinguinLink?.meta.regionalLimitations ??
            null,
          countryLimitation: data.countryLimitation?.length
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
          originalName:
            kinguinLink?.meta.originalName ?? smmFields?.smmServiceName ?? null,
          metacriticScore: kinguinLink?.meta.metacriticScore ?? null,
          sourceCostPrice:
            data.sourceCostPrice ??
            (kinguinLink
              ? String(kinguinLink.costClp)
              : smmFields
                ? String(smmFields.sourceCostClp)
                : null),
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

      if (data.assets.length > 0) {
        await tx.asset.createMany({
          data: data.assets.map((asset) =>
            assetCreateData(asset, { productId: created.id }),
          ),
        });
      }

      if (kinguinLink) {
        await writeKinguinRelatedRecords(
          tx,
          created.id,
          kinguinLink.remote,
          kinguinLink.cheapest.offerId,
          { imageAssets: mirroredImages?.assets ?? [] },
        );
      }

      return created;
    });

    revalidatePath("/admin/products");
    if (kinguinLink) {
      await invalidateKinguinSearchCache();
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

    if (
      error instanceof Error &&
      error.message === "KINGUIN_ALREADY_IMPORTED"
    ) {
      return {
        success: false,
        message: "Este producto Kinguin ya está importado.",
        fieldErrors: { kinguinId: ["Ya importado"] },
      };
    }

    if (
      error instanceof Error &&
      error.message === "KINGUIN_PRODUCT_NOT_FOUND"
    ) {
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

    if (
      error instanceof Error &&
      error.message.startsWith("R2_CONFIG_MISSING:")
    ) {
      return {
        success: false,
        message:
          "R2 no está configurado. Configura el almacenamiento para importar imágenes de Kinguin.",
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

  let submission: unknown;
  try {
    submission = parseSubmission(rawInput);
  } catch {
    return {
      success: false,
      message: "Los datos del formulario son inválidos.",
    };
  }

  const parsed = updateProductSchema.safeParse(submission);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const data = parsed.data;
  const pricing = normalizeOfferFields(data);
  let removedObjectKeys: string[] = [];

  try {
    await prisma.$transaction(async (tx) => {
      const existingAssets = await tx.asset.findMany({
        where: { productId: data.id },
        select: { objectKey: true },
      });
      const retainedKeys = new Set(
        data.assets.flatMap((asset) =>
          asset.objectKey ? [asset.objectKey] : [],
        ),
      );
      removedObjectKeys = existingAssets.flatMap((asset) =>
        asset.objectKey && !retainedKeys.has(asset.objectKey)
          ? [asset.objectKey]
          : [],
      );

      await tx.product.update({
        where: { id: data.id },
        data: {
          name: data.name,
          slug: data.slug,
          description: data.description ?? null,
          coverImageUrl:
            coverUrlFromAssets(data.assets) ?? data.coverImageUrl ?? null,
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

      await tx.asset.deleteMany({ where: { productId: data.id } });
      if (data.assets.length > 0) {
        await tx.asset.createMany({
          data: data.assets.map((asset) =>
            assetCreateData(asset, { productId: data.id }),
          ),
        });
      }
    });

    await Promise.all(
      removedObjectKeys.map((key) =>
        deleteImageFromR2(key).catch(() => undefined),
      ),
    );

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

/** Hard-delete a product. Blocked when it has order history (FK Restrict). */
export async function deleteProductAction(
  rawInput: unknown,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession();
  if (!session) {
    return unauthorized();
  }

  const parsed = deleteProductSchema.safeParse(rawInput);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const product = await prisma.product.findUnique({
    where: { id: parsed.data.id },
    select: {
      id: true,
      _count: { select: { orderItems: true } },
      assets: { select: { objectKey: true } },
    },
  });

  if (!product) {
    return { success: false, message: "Producto no encontrado." };
  }

  if (product._count.orderItems > 0) {
    return {
      success: false,
      message:
        "No se puede eliminar: tiene ventas asociadas. Archívalo para ocultarlo del catálogo.",
    };
  }

  const objectKeys = product.assets
    .map((asset) => asset.objectKey)
    .filter((key): key is string => Boolean(key));

  try {
    await prisma.product.delete({ where: { id: product.id } });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return {
        success: false,
        message:
          "No se puede eliminar: está referenciado por órdenes. Archívalo en su lugar.",
      };
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return { success: false, message: "Producto no encontrado." };
    }
    return {
      success: false,
      message: "No se pudo eliminar el producto.",
    };
  }

  await Promise.all(
    objectKeys.map((key) => deleteImageFromR2(key).catch(() => undefined)),
  );

  revalidatePath("/admin/products");
  return { success: true, data: { id: product.id } };
}

/**
 * Translate product text fields in-memory (for the edit form). Does not persist.
 */
export async function translateProductTextAction(
  rawInput: unknown,
): Promise<ActionResult<{ fields: ProductTranslateFields }>> {
  const session = await requireSession();
  if (!session) {
    return unauthorized();
  }

  const parsed = translateProductTextSchema.safeParse(rawInput);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  try {
    const fields = await translateProductFields(parsed.data.fields, {
      only: parsed.data.only,
      force: parsed.data.force,
    });

    if (Object.keys(fields).length === 0) {
      return {
        success: false,
        message:
          "Nada que traducir: los campos están vacíos o ya parecen estar en español.",
      };
    }

    return { success: true, data: { fields } };
  } catch (error) {
    const message =
      error instanceof Error ? error.message.slice(0, 300) : "Error de traducción";
    return { success: false, message };
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
      const maxSort = await tx.asset.aggregate({
        where: { productId },
        _max: { sortOrder: true },
      });

      const created = await tx.asset.create({
        data: {
          productId,
          type: "IMAGE",
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
    const objectKey = await prisma.$transaction(async (tx) => {
      const image = await tx.asset.findFirst({
        where: { id: imageId, productId, type: "IMAGE" },
        select: { id: true, url: true, objectKey: true },
      });

      if (!image) {
        throw new Error("IMAGE_NOT_FOUND");
      }

      const product = await tx.product.findUnique({
        where: { id: productId },
        select: { coverImageUrl: true },
      });

      await tx.asset.delete({ where: { id: image.id } });

      if (product?.coverImageUrl === image.url) {
        const nextImage = await tx.asset.findFirst({
          where: { productId, type: "IMAGE" },
          orderBy: { sortOrder: "asc" },
          select: { url: true, objectKey: true },
        });

        await tx.product.update({
          where: { id: productId },
          data: {
            coverImageUrl: nextImage?.url ?? null,
          },
        });
      }

      return image.objectKey;
    });

    if (objectKey) {
      await deleteImageFromR2(objectKey).catch(() => undefined);
    }

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
        prisma.asset.updateMany({
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
      const image = await prisma.asset.findFirst({
        where: { id: imageId, productId, type: "IMAGE" },
        select: { url: true, objectKey: true },
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

export async function addProductAccountsAction(
  rawInput: unknown,
): Promise<ActionResult<{ created: number }>> {
  const session = await requireSession();
  if (!session) return unauthorized();

  const parsed = addProductAccountsSchema.safeParse(
    rawInput instanceof FormData
      ? (() => {
          const payload = rawInput.get("payload");
          return typeof payload === "string" ? JSON.parse(payload) : rawInput;
        })()
      : rawInput,
  );
  if (!parsed.success) return validationError(parsed.error);

  const { productId, accounts } = parsed.data;
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, deliveryMethod: true },
  });
  if (!product) {
    return { success: false, message: "Producto no encontrado." };
  }
  if (product.deliveryMethod !== DeliveryMethod.MANUAL) {
    return {
      success: false,
      message: "Solo productos MANUAL admiten inventario de cuentas.",
    };
  }

  const valid = accounts.filter(
    (account) =>
      account.username ||
      account.email ||
      account.password ||
      account.token ||
      account.url,
  );
  if (valid.length === 0) {
    return {
      success: false,
      message:
        "Cada cuenta necesita al menos un dato (usuario, email, password, token o URL).",
    };
  }

  try {
    await prisma.productAccount.createMany({
      data: valid.map((account) => ({
        productId,
        status: ProductKeyStatus.AVAILABLE,
        contentType: DeliveryContentType.USERNAME_PASSWORD,
        label: account.label ?? null,
        username: account.username ?? null,
        email: account.email ?? null,
        passwordEncrypted: account.password
          ? encryptSecret(account.password)
          : null,
        tokenEncrypted: account.token ? encryptSecret(account.token) : null,
        url: account.url ?? null,
        notes: account.notes ?? null,
      })),
    });
    revalidatePath(`/admin/products/${productId}`);
    return { success: true, data: { created: valid.length } };
  } catch {
    return { success: false, message: "No se pudieron agregar las cuentas." };
  }
}

export async function revokeProductAccountAction(
  rawInput: unknown,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession();
  if (!session) return unauthorized();

  const parsed = revokeProductAccountSchema.safeParse(rawInput);
  if (!parsed.success) return validationError(parsed.error);

  const account = await prisma.productAccount.findFirst({
    where: {
      id: parsed.data.accountId,
      productId: parsed.data.productId,
    },
    select: { id: true, status: true },
  });
  if (!account) {
    return { success: false, message: "Cuenta no encontrada." };
  }
  if (account.status === ProductKeyStatus.SOLD) {
    return {
      success: false,
      message: "No se puede revocar una cuenta ya vendida.",
    };
  }

  await prisma.productAccount.update({
    where: { id: account.id },
    data: {
      status: ProductKeyStatus.REVOKED,
      orderItemId: null,
      reservedUntil: null,
    },
  });
  revalidatePath(`/admin/products/${parsed.data.productId}`);
  return { success: true, data: { id: account.id } };
}
