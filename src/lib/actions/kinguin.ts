"use server";

import { revalidatePath } from "next/cache";
import { flattenError } from "zod";

import type { ActionResult } from "@/lib/actions/types";
import { requireSession } from "@/lib/auth/session";
import {
  getKinguinProductPreview,
  importKinguinProduct,
} from "@/lib/kinguin/import";
import { applyMarkupPct, eurToClp, getEurToClpRate } from "@/lib/fx/eur-clp";
import { createStructuredResponse } from "@/lib/openai/client";
import { KINGUIN_SELECTION_LIMIT } from "@/lib/smm-services/constants";
import {
  exportKinguinAsProductsSchema,
  importKinguinProductSchema,
  importKinguinProductsBulkSchema,
  priceKinguinProductsSchema,
  translateKinguinProductsSchema,
} from "@/lib/validations/kinguin";
import { getKinguinClient } from "@/lib/kinguin-client";
import { slugify } from "@/lib/products/format";
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

/** Heuristic: skip AI when the text already looks Spanish. */
function looksAlreadySpanish(text: string): boolean {
  const value = text.trim();
  if (!value) return false;
  if (/[áéíóúüñÁÉÍÓÚÜÑ¿¡]/.test(value)) return true;
  return false;
}

function needsTranslation(text: string | null | undefined): boolean {
  const value = text?.trim() ?? "";
  if (!value) return false;
  return !looksAlreadySpanish(value);
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
    const [eurClpRate, remotes] = await Promise.all([
      getEurToClpRate(),
      Promise.all(
        hits.map(async (hit) => {
          try {
            const product = await client.getProductByKinguinId(hit.kinguinId);
            return { hit, product };
          } catch {
            return { hit, product: null };
          }
        }),
      ),
    ]);

    const items: ImportProductItem[] = remotes.map(({ hit, product }) => {
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
        deliveryMethod: "KINGUIN",
        status: "DRAFT",
        qty,
        currency: "CLP",
        textQty:
          typeof product?.textQty === "number" &&
          Number.isFinite(product.textQty)
            ? Math.max(0, Math.floor(product.textQty))
            : undefined,
      };
    });

    return { success: true, data: { items, eurClpRate } };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message.slice(0, 300)
          : "No se pudo generar el JSON de productos.",
    };
  }
}

/** AI translation of product text fields. Does not touch prices. */
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
    const remotes = await Promise.all(
      parsed.data.kinguinIds.map(async (kinguinId) => {
        const product = await client.getProductByKinguinId(kinguinId);
        return { kinguinId, product };
      }),
    );

    type AiPayload = {
      items: Array<{
        kinguinId: number;
        nameEs: string;
        descriptionEs: string;
        activationDetailsEs: string;
        regionalLimitationsEs: string;
      }>;
    };

    const toTranslate = remotes.filter(({ product }) =>
      [
        product.name,
        product.description,
        product.activationDetails,
        product.regionalLimitations,
      ].some((field) => needsTranslation(field)),
    );

    const ai =
      toTranslate.length === 0
        ? { items: [] as AiPayload["items"] }
        : await createStructuredResponse<AiPayload>({
            schemaName: "kinguin_product_translate",
            instructions: [
              "Traduce al español (neutro latinoamericano) todo el texto posible de productos digitales Kinguin.",
              "Campos: nameEs (título), descriptionEs (descripción HTML o texto), activationDetailsEs, regionalLimitationsEs.",
              "Mantén marcas, ediciones y plataformas (Steam, Xbox, PlayStation, Epic, etc.).",
              "Si el título es un nombre propio de juego, usa el nombre comercial habitual en Latam o déjalo en inglés si no hay traducción establecida.",
              "Preserva HTML/markdown de la descripción si existe; traduce solo el contenido visible.",
              "Si un campo viene vacío, devuélvelo como string vacío.",
              "No inventes IDs: usa exactamente los kinguinId recibidos (números).",
              "Responde solo con el JSON estructurado solicitado.",
            ].join(" "),
            input: JSON.stringify({
              products: toTranslate.map(({ kinguinId, product }) => ({
                kinguinId,
                name: product.name,
                description: product.description ?? "",
                activationDetails: product.activationDetails ?? "",
                regionalLimitations: product.regionalLimitations ?? "",
              })),
            }),
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["items"],
              properties: {
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: [
                      "kinguinId",
                      "nameEs",
                      "descriptionEs",
                      "activationDetailsEs",
                      "regionalLimitationsEs",
                    ],
                    properties: {
                      kinguinId: { type: "integer" },
                      nameEs: { type: "string" },
                      descriptionEs: { type: "string" },
                      activationDetailsEs: { type: "string" },
                      regionalLimitationsEs: { type: "string" },
                    },
                  },
                },
              },
            },
          });

    const byId = new Map(
      ai.items.map((row) => [row.kinguinId, row] as const),
    );

    const items: TranslatedKinguinItem[] = remotes.map(
      ({ kinguinId, product }) => {
        const translated = byId.get(kinguinId);
        return {
          kinguinId,
          nameEs: translated?.nameEs.trim() || product.name,
          descriptionEs:
            translated?.descriptionEs.trim() || product.description || "",
          activationDetailsEs:
            translated?.activationDetailsEs.trim() ||
            product.activationDetails ||
            "",
          regionalLimitationsEs:
            translated?.regionalLimitationsEs.trim() ||
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

  if (parsed.data.items.length > KINGUIN_SELECTION_LIMIT) {
    return {
      success: false,
      message: `Máximo ${KINGUIN_SELECTION_LIMIT} productos por operación.`,
    };
  }

  try {
    await eurToClp(1);

    const created: Array<{ kinguinId: number; productId: string }> = [];
    const failed: Array<{ kinguinId: number; message: string }> = [];

    for (const item of parsed.data.items) {
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
        created.push({ kinguinId: item.kinguinId, productId: result.productId });
      } catch (error) {
        failed.push({
          kinguinId: item.kinguinId,
          message:
            mapImportError(error) ??
            (error instanceof Error
              ? error.message.slice(0, 200)
              : "Error al importar"),
        });
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
