"use server";

import { revalidatePath } from "next/cache";
import pLimit from "p-limit";
import { flattenError } from "zod";

import type { ActionResult } from "@/lib/actions/types";
import { requireSession } from "@/lib/auth/session";
import {
  getKinguinProductPreview,
  importKinguinProduct,
} from "@/lib/kinguin/import";
import {
  kinguinVideosToAssetInputs,
  mirroredImagesToAssetInputs,
  mirrorKinguinProductImages,
} from "@/lib/kinguin/mirror-images";
import { applyMarkupPct, eurToClp, getEurToClpRate } from "@/lib/fx/eur-clp";
import {
  IMPORT_CONCURRENCY,
  KINGUIN_FETCH_CONCURRENCY,
  KINGUIN_PROCESS_LIMIT,
} from "@/lib/smm-services/constants";
import {
  exportKinguinAsProductsSchema,
  importKinguinProductSchema,
  importKinguinProductsBulkSchema,
  priceKinguinProductsSchema,
  translateKinguinProductsSchema,
} from "@/lib/validations/kinguin";
import { getKinguinClient } from "@/lib/kinguin-client";
import { slugify } from "@/lib/products/format";
import { translateProductFieldsBulk } from "@/lib/products/translate-fields";
import type { ImportProductItem } from "@/lib/validations/product-import";
import type { KinguinProductPreviewDto } from "@/types/kinguin-admin";

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

function randomMarkupPct(min: number, max: number): number {
  const low = Math.min(min, max);
  const high = Math.max(min, max);
  return low + Math.floor(Math.random() * (high - low + 1));
}

function mapImportError(error: unknown): string | null {
  if (!(error instanceof Error)) return null;

  switch (error.message) {
    case "KINGUIN_ALREADY_IMPORTED":
      return "Este producto Kinguin ya está importado.";
    case "KINGUIN_PRODUCT_NOT_FOUND":
      return "Producto no encontrado en Kinguin.";
    case "KINGUIN_NO_OFFERS":
      return "El producto no tiene ofertas disponibles.";
    case "CATEGORY_NOT_FOUND":
      return "Una o más categorías no existen.";
    default:
      if (error.message.startsWith("R2_CONFIG_MISSING:")) {
        return "R2 no está configurado. Configura el almacenamiento para importar imágenes de Kinguin.";
      }
      return null;
  }
}

function mapImportActionError(error: unknown): ActionResult<never> | null {
  const message = mapImportError(error);
  if (!message || !(error instanceof Error)) return null;

  if (error.message === "KINGUIN_ALREADY_IMPORTED") {
    return {
      success: false,
      message,
      fieldErrors: { kinguinId: ["Ya importado"] },
    };
  }
  if (error.message === "CATEGORY_NOT_FOUND") {
    return {
      success: false,
      message,
      fieldErrors: { categoryIds: ["Categoría inválida"] },
    };
  }

  return { success: false, message };
}

export type PricedKinguinItem = {
  kinguinId: number;
  markupPct: number;
  priceClp: number;
  costClp: number;
  priceEur: number | null;
};

export type TranslatedKinguinItem = {
  kinguinId: number;
  nameEs: string;
  descriptionEs: string;
  activationDetailsEs: string;
  regionalLimitationsEs: string;
};

export async function getKinguinProductPreviewAction(
  rawInput: unknown,
): Promise<
  ActionResult<{
    preview: KinguinProductPreviewDto;
    eurClpRate: number;
    suggestedPriceClp: number | null;
    costClp: number | null;
  }>
> {
  const session = await requireSession();
  if (!session) {
    return unauthorized();
  }

  const parsed = importKinguinProductSchema
    .pick({ kinguinId: true, markupPct: true })
    .safeParse(rawInput);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  try {
    const [preview, eurClpRate] = await Promise.all([
      getKinguinProductPreview(parsed.data.kinguinId),
      getEurToClpRate(),
    ]);

    const costEur = preview.priceEur;
    const costClp =
      costEur != null ? Math.round(costEur * eurClpRate) : null;
    const suggestedPriceClp =
      costClp != null
        ? applyMarkupPct(costClp, parsed.data.markupPct)
        : null;

    return {
      success: true,
      data: { preview, eurClpRate, suggestedPriceClp, costClp },
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message.slice(0, 300)
          : "No se pudo cargar el producto Kinguin.",
    };
  }
}

/** Random markup + EUR→CLP pricing. No AI. */
export async function priceKinguinProductsAction(
  rawInput: unknown,
): Promise<
  ActionResult<{ items: PricedKinguinItem[]; eurClpRate: number }>
> {
  const session = await requireSession();
  if (!session) {
    return unauthorized();
  }

  const parsed = priceKinguinProductsSchema.safeParse(rawInput);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  try {
    const eurClpRate = await getEurToClpRate();
    const { items: hits, minMarkupPct, maxMarkupPct } = parsed.data;

    const items: PricedKinguinItem[] = hits.map((hit) => {
      const priceEur = hit.priceEur;
      const costClp =
        priceEur != null && Number.isFinite(priceEur)
          ? Math.round(priceEur * eurClpRate)
          : 0;
      const markupPct = randomMarkupPct(minMarkupPct, maxMarkupPct);

      return {
        kinguinId: hit.kinguinId,
        markupPct,
        priceClp: applyMarkupPct(costClp, markupPct),
        costClp,
        priceEur,
      };
    });

    return { success: true, data: { items, eurClpRate } };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message.slice(0, 300)
          : "No se pudieron calcular los precios.",
    };
  }
}

function buildKinguinExportDescription(input: {
  name: string;
  platform: string | null | undefined;
  description: string | null | undefined;
  priceEur: number | null;
  kinguinId: number;
}): string {
  const lines = [
    input.description?.trim() || null,
    input.platform ? `Plataforma: ${input.platform}` : null,
    input.priceEur != null ? `Precio origen: EUR ${input.priceEur.toFixed(2)}` : null,
    `Kinguin ID: ${input.kinguinId}`,
  ].filter((line): line is string => Boolean(line));

  return lines.join("\n\n").slice(0, 10000);
}

/**
 * Maps selected Kinguin hits → product-import JSON items (admin/products).
 * Prices use random markup between min/max and EUR→CLP FX.
 * Mirrors cover/screenshots to R2 and includes YouTube videos + source cost.
 */
export async function exportKinguinAsProductsAction(
  rawInput: unknown,
): Promise<
  ActionResult<{ items: ImportProductItem[]; eurClpRate: number }>
> {
  const session = await requireSession();
  if (!session) {
    return unauthorized();
  }

  const parsed = exportKinguinAsProductsSchema.safeParse(rawInput);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const { items: hits, minMarkupPct, maxMarkupPct } = parsed.data;

  try {
    const client = getKinguinClient();
    const eurClpRate = await getEurToClpRate();
    const fetchLimit = pLimit(KINGUIN_FETCH_CONCURRENCY);

    const remotes = await Promise.all(
      hits.map((hit) =>
        fetchLimit(async () => {
          try {
            const product = await client.getProductByKinguinId(hit.kinguinId);
            return { hit, product };
          } catch {
            return { hit, product: null };
          }
        }),
      ),
    );

    const mirrorLimit = pLimit(Math.min(4, KINGUIN_FETCH_CONCURRENCY));
    const items: ImportProductItem[] = await Promise.all(
      remotes.map(({ hit, product }) =>
        mirrorLimit(async () => {
          const priceEur =
            hit.priceEur ??
            (typeof product?.price === "number" && Number.isFinite(product.price)
              ? product.price
              : null);
          const costClp =
            priceEur != null && Number.isFinite(priceEur)
              ? Math.round(priceEur * eurClpRate)
              : 0;
          const markupPct = randomMarkupPct(minMarkupPct, maxMarkupPct);
          const priceClp = applyMarkupPct(costClp, markupPct);
          const name = (product?.name || hit.name).slice(0, 200);
          const baseSlug = slugify(name) || "juego-kinguin";
          const qty =
            typeof product?.qty === "number" && Number.isFinite(product.qty)
              ? Math.max(0, Math.floor(product.qty))
              : 0;

          let coverImageUrl: string | undefined;
          let assets: ImportProductItem["assets"] = [];

          if (product) {
            const mirrored = await mirrorKinguinProductImages(product);
            const imageAssets = mirroredImagesToAssetInputs(mirrored);
            const videoAssets = kinguinVideosToAssetInputs(
              product,
              imageAssets.length,
            );
            assets = [...imageAssets, ...videoAssets];
            coverImageUrl = mirrored.coverImageUrl ?? undefined;
          }

          return {
            name,
            slug: `${baseSlug.slice(0, 100)}-${hit.kinguinId}`,
            description: buildKinguinExportDescription({
              name,
              platform: product?.platform ?? null,
              description: product?.description ?? null,
              priceEur,
              kinguinId: hit.kinguinId,
            }),
            price: String(priceClp),
            sourceCostPrice: String(costClp),
            deliveryMethod: "KINGUIN" as const,
            status: "DRAFT" as const,
            qty,
            currency: "CLP",
            coverImageUrl,
            textQty:
              typeof product?.textQty === "number" &&
              Number.isFinite(product.textQty)
                ? Math.max(0, Math.floor(product.textQty))
                : undefined,
            assets,
          };
        }),
      ),
    );

    return { success: true, data: { items, eurClpRate } };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith("R2_CONFIG_MISSING:")
    ) {
      return {
        success: false,
        message:
          "R2 no está configurado. Configura el almacenamiento para exportar imágenes de Kinguin.",
      };
    }
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message.slice(0, 300)
          : "No se pudo generar el JSON de productos.",
    };
  }
}

/** Full AI translation: name, description, activation, regional limitations (p-limit). */
export async function translateKinguinProductsAction(
  rawInput: unknown,
): Promise<ActionResult<{ items: TranslatedKinguinItem[] }>> {
  const session = await requireSession();
  if (!session) {
    return unauthorized();
  }

  const parsed = translateKinguinProductsSchema.safeParse(rawInput);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  try {
    const client = getKinguinClient();
    const fetchLimit = pLimit(KINGUIN_FETCH_CONCURRENCY);
    const remotes = await Promise.all(
      parsed.data.kinguinIds.map((kinguinId) =>
        fetchLimit(async () => {
          const product = await client.getProductByKinguinId(kinguinId);
          return { kinguinId, product };
        }),
      ),
    );

    const translatedById = await translateProductFieldsBulk(
      remotes.map(({ kinguinId, product }) => ({
        productId: String(kinguinId),
        fields: {
          name: product.name,
          description: product.description ?? "",
          activationDetails: product.activationDetails ?? "",
          regionalLimitations: product.regionalLimitations ?? "",
        },
      })),
    );

    const items: TranslatedKinguinItem[] = remotes.map(
      ({ kinguinId, product }) => {
        const translated = translatedById.get(String(kinguinId));
        return {
          kinguinId,
          nameEs: translated?.name?.trim() || product.name,
          descriptionEs:
            translated?.description?.trim() || product.description || "",
          activationDetailsEs:
            translated?.activationDetails?.trim() ||
            product.activationDetails ||
            "",
          regionalLimitationsEs:
            translated?.regionalLimitations?.trim() ||
            product.regionalLimitations ||
            "",
        };
      },
    );

    return { success: true, data: { items } };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al llamar a OpenAI";
    return { success: false, message };
  }
}

export async function importKinguinProductAction(
  rawInput: unknown,
): Promise<ActionResult<{ productId: string }>> {
  const session = await requireSession();
  if (!session) {
    return unauthorized();
  }

  const parsed = importKinguinProductSchema.safeParse(rawInput);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  try {
    // Warm FX cache; import uses eurToClp internally when cost override is absent.
    await eurToClp(1);

    const result = await importKinguinProduct(parsed.data);

    revalidatePath("/admin/kinguin");
    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${result.productId}`);

    return { success: true, data: { productId: result.productId } };
  } catch (error) {
    const mapped = mapImportActionError(error);
    if (mapped) return mapped;

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message.slice(0, 300)
          : "No se pudo importar el producto.",
    };
  }
}

export async function importKinguinProductsBulkAction(
  rawInput: unknown,
): Promise<
  ActionResult<{
    created: Array<{ kinguinId: number; productId: string }>;
    failed: Array<{ kinguinId: number; message: string }>;
  }>
> {
  const session = await requireSession();
  if (!session) {
    return unauthorized();
  }

  const parsed = importKinguinProductsBulkSchema.safeParse(rawInput);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  if (parsed.data.items.length > KINGUIN_PROCESS_LIMIT) {
    return {
      success: false,
      message: `Máximo ${KINGUIN_PROCESS_LIMIT} productos por operación.`,
    };
  }

  try {
    await eurToClp(1);

    const created: Array<{ kinguinId: number; productId: string }> = [];
    const failed: Array<{ kinguinId: number; message: string }> = [];
    const importLimit = pLimit(IMPORT_CONCURRENCY);

    const results = await Promise.all(
      parsed.data.items.map((item) =>
        importLimit(async () => {
          try {
            const result = await importKinguinProduct({
              kinguinId: item.kinguinId,
              markupPct: item.markupPct,
              categoryIds: parsed.data.categoryIds,
              name: item.name,
              description: item.description,
              activationDetails: item.activationDetails,
              regionalLimitations: item.regionalLimitations,
              price: item.price,
              sourceCostPrice: item.sourceCostPrice,
            });
            return {
              ok: true as const,
              kinguinId: item.kinguinId,
              productId: result.productId,
            };
          } catch (error) {
            return {
              ok: false as const,
              kinguinId: item.kinguinId,
              message:
                mapImportError(error) ??
                (error instanceof Error
                  ? error.message.slice(0, 200)
                  : "Error al importar"),
            };
          }
        }),
      ),
    );

    for (const result of results) {
      if (result.ok) {
        created.push({
          kinguinId: result.kinguinId,
          productId: result.productId,
        });
      } else {
        failed.push({ kinguinId: result.kinguinId, message: result.message });
      }
    }

    revalidatePath("/admin/kinguin");
    revalidatePath("/admin/products");

    if (created.length === 0) {
      return {
        success: false,
        message:
          failed[0]?.message ??
          "No se pudo importar ningún producto.",
      };
    }

    return { success: true, data: { created, failed } };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message.slice(0, 300)
          : "No se pudieron importar los productos.",
    };
  }
}
