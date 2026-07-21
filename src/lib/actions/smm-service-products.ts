"use server";

import { revalidatePath } from "next/cache";
import { flattenError } from "zod";

import {
  DeliveryMethod,
  Prisma,
  ProductStatus,
} from "@/generated/prisma/client";
import type { ActionResult } from "@/lib/actions/types";
import { requireSession } from "@/lib/auth/session";
import { applyMarkupPct, getUsdToClpRate } from "@/lib/fx/usd-clp";
import { createStructuredResponse } from "@/lib/openai/client";
import prisma from "@/lib/prisma";
import { slugify } from "@/lib/products/format";
import {
  getSmmServiceIdsForQuery,
  getSmmServicesByIds,
} from "@/lib/smm-providers/queries";
import { SMM_SERVICE_PROCESS_LIMIT } from "@/lib/smm-services/constants";
import {
  convertSmmServicesToProductsSchema,
  exportSmmServicesAsProductsSchema,
  prefillSmmServicesSchema,
  selectSmmServicesForQuerySchema,
} from "@/lib/validations/smm-service-products";
import type { ImportProductItem } from "@/lib/validations/product-import";
import type { SmmServiceListItemDto } from "@/types/smm-provider";

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

/** Heuristic: skip AI when the title already looks Spanish. */
function looksAlreadySpanish(name: string): boolean {
  const text = name.trim();
  if (!text) return false;
  if (/[áéíóúüñÁÉÍÓÚÜÑ¿¡]/.test(text)) return true;

  return /\b(seguidores|suscriptores|me\s*gustas?|comentarios|visualizaciones|reproducciones|visitas|compartidos|miembros|historias|garantizado|rápido|rapido|calidad)\b/i.test(
    text,
  );
}

export type PrefillServiceItem = {
  serviceId: string;
  nameEs: string;
  descriptionEs: string;
  markupPct: number;
  priceClp: number;
  rateUsd: number;
  baseClp: number;
};

export async function selectSmmServicesForQueryAction(
  rawInput: unknown,
): Promise<ActionResult<{ items: SmmServiceListItemDto[] }>> {
  const session = await requireSession();
  if (!session) {
    return unauthorized();
  }

  const parsed = selectSmmServicesForQuerySchema.safeParse(rawInput);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const items = await getSmmServiceIdsForQuery(
    parsed.data.query,
    parsed.data.limit,
  );

  return { success: true, data: { items } };
}

export async function prefillSmmServicesWithAiAction(
  rawInput: unknown,
): Promise<ActionResult<{ items: PrefillServiceItem[]; usdClpRate: number }>> {
  const session = await requireSession();
  if (!session) {
    return unauthorized();
  }

  const parsed = prefillSmmServicesSchema.safeParse(rawInput);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const { serviceIds, minMarkupPct, maxMarkupPct } = parsed.data;
  const services = await getSmmServicesByIds(serviceIds);

  if (services.length === 0) {
    return { success: false, message: "No se encontraron servicios." };
  }

  try {
    type AiPayload = {
      items: Array<{
        serviceId: string;
        nameEs: string;
      }>;
    };

    const toTranslate = services.filter(
      (service) => !looksAlreadySpanish(service.name),
    );

    const [ai, usdClpRate] = await Promise.all([
      toTranslate.length === 0
        ? Promise.resolve({ items: [] as AiPayload["items"] })
        : createStructuredResponse<AiPayload>({
            schemaName: "smm_service_title_translate",
            instructions: [
              "Traduce nombres de servicios SMM al español (neutro latinoamericano).",
              "Mantén marcas/plataformas (Instagram, TikTok, YouTube, etc.) cuando aplique.",
              "No inventes IDs: usa exactamente los serviceId recibidos.",
              "Responde solo con el JSON estructurado solicitado.",
            ].join(" "),
            input: JSON.stringify({
              services: toTranslate.map((service) => ({
                serviceId: service.id,
                name: service.name,
                type: service.type,
                category: service.category,
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
                    required: ["serviceId", "nameEs"],
                    properties: {
                      serviceId: { type: "string" },
                      nameEs: { type: "string" },
                    },
                  },
                },
              },
            },
          }),
      getUsdToClpRate(),
    ]);

    const nameById = new Map(
      ai.items.map((row) => [row.serviceId, row.nameEs.trim()] as const),
    );

    const items: PrefillServiceItem[] = services.map((service) => {
      const rateUsd = Number.parseFloat(service.rate) || 0;
      const baseClp = Math.round(rateUsd * usdClpRate);
      const markupPct = randomMarkupPct(minMarkupPct, maxMarkupPct);
      const alreadySpanish = looksAlreadySpanish(service.name);

      return {
        serviceId: service.id,
        nameEs: alreadySpanish
          ? service.name
          : nameById.get(service.id) || service.name,
        descriptionEs: "",
        markupPct,
        priceClp: applyMarkupPct(baseClp, markupPct),
        rateUsd,
        baseClp,
      };
    });

    return { success: true, data: { items, usdClpRate } };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al llamar a OpenAI";
    return { success: false, message };
  }
}

function buildServiceDescription(service: SmmServiceListItemDto): string {
  return [
    `Tipo: ${service.type}`,
    `Categoría panel: ${service.category}`,
    `Cantidad permitida: ${service.min.toLocaleString("es-CL")} – ${service.max.toLocaleString("es-CL")}`,
    `Refill: ${service.refill ? "sí" : "no"}`,
    `Cancel: ${service.cancel ? "sí" : "no"}`,
    `Rate proveedor: USD ${service.rate}`,
    `Provider: ${service.providerName}`,
  ].join("\n");
}

/**
 * Maps selected SMM services → product-import JSON items (admin/products).
 * Prices use random markup between min/max and USD→CLP FX.
 */
export async function exportSmmServicesAsProductsAction(
  rawInput: unknown,
): Promise<
  ActionResult<{ items: ImportProductItem[]; usdClpRate: number }>
> {
  const session = await requireSession();
  if (!session) {
    return unauthorized();
  }

  const parsed = exportSmmServicesAsProductsSchema.safeParse(rawInput);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const { serviceIds, minMarkupPct, maxMarkupPct } = parsed.data;
  const services = await getSmmServicesByIds(serviceIds);

  if (services.length === 0) {
    return { success: false, message: "No se encontraron servicios." };
  }

  if (services.length !== serviceIds.length) {
    return {
      success: false,
      message: "Uno o más servicios no existen.",
    };
  }

  try {
    const usdClpRate = await getUsdToClpRate();
    const byId = new Map(services.map((service) => [service.id, service]));

    const items: ImportProductItem[] = serviceIds.map((serviceId) => {
      const service = byId.get(serviceId);
      if (!service) {
        throw new Error("SERVICE_NOT_FOUND");
      }

      const rateUsd = Number.parseFloat(service.rate) || 0;
      const baseClp = Math.round(rateUsd * usdClpRate);
      const markupPct = randomMarkupPct(minMarkupPct, maxMarkupPct);
      const priceClp = applyMarkupPct(baseClp, markupPct);
      const baseSlug = slugify(service.name) || "servicio-smm";

      return {
        name: service.name.slice(0, 200),
        slug: `${baseSlug.slice(0, 100)}-${service.remoteServiceId}`,
        description: buildServiceDescription(service),
        price: String(priceClp),
        deliveryMethod: "SMM",
        status: "DRAFT",
        qty: 0,
        currency: "CLP",
      };
    });

    return { success: true, data: { items, usdClpRate } };
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

async function uniqueSlug(
  tx: Prisma.TransactionClient,
  base: string,
): Promise<string> {
  let candidate = slugify(base) || "servicio-smm";
  candidate = candidate.slice(0, 110);

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const next = attempt === 0 ? candidate : `${candidate}-${attempt + 1}`;
    const existing = await tx.product.findUnique({
      where: { slug: next },
      select: { id: true },
    });
    if (!existing) {
      return next;
    }
  }

  return `${candidate}-${Date.now().toString(36)}`;
}

export async function convertSmmServicesToProductsAction(
  rawInput: unknown,
): Promise<
  ActionResult<{ created: Array<{ serviceId: string; productId: string }> }>
> {
  const session = await requireSession();
  if (!session) {
    return unauthorized();
  }

  const parsed = convertSmmServicesToProductsSchema.safeParse(rawInput);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  if (parsed.data.items.length > SMM_SERVICE_PROCESS_LIMIT) {
    return {
      success: false,
      message: `Máximo ${SMM_SERVICE_PROCESS_LIMIT} servicios por operación.`,
    };
  }

  const serviceIds = parsed.data.items.map((item) => item.serviceId);
  const services = await getSmmServicesByIds(serviceIds);

  if (services.length !== serviceIds.length) {
    return {
      success: false,
      message: "Uno o más servicios no existen.",
    };
  }

  const serviceById = new Map(services.map((service) => [service.id, service]));

  if (parsed.data.categoryIds.length > 0) {
    const count = await prisma.category.count({
      where: { id: { in: parsed.data.categoryIds } },
    });
    if (count !== parsed.data.categoryIds.length) {
      return {
        success: false,
        message: "Una o más categorías no existen.",
        fieldErrors: { categoryIds: ["Categoría inválida"] },
      };
    }
  }

  try {
    const usdClpRate = await getUsdToClpRate();
    const created = await prisma.$transaction(async (tx) => {
      const results: Array<{ serviceId: string; productId: string }> = [];

      for (const item of parsed.data.items) {
        const service = serviceById.get(item.serviceId);
        if (!service) {
          throw new Error("SERVICE_NOT_FOUND");
        }

        const slug =
          item.slug ?? (await uniqueSlug(tx, item.name || service.name));
        const rateUsd = Number.parseFloat(service.rate) || 0;
        const baseClp = Math.round(rateUsd * usdClpRate);
        const description =
          item.description?.trim() ||
          [
            `Tipo: ${service.type}`,
            `Categoría panel: ${service.category}`,
            `Cantidad permitida: ${service.min.toLocaleString("es-CL")} – ${service.max.toLocaleString("es-CL")}`,
            `Refill: ${service.refill ? "sí" : "no"}`,
            `Cancel: ${service.cancel ? "sí" : "no"}`,
            `Rate proveedor: USD ${service.rate}`,
          ].join("\n");

        const product = await tx.product.create({
          data: {
            name: item.name,
            slug,
            description,
            originalName: service.name,
            status: ProductStatus.DRAFT,
            deliveryMethod: DeliveryMethod.SMM,
            price: item.price,
            currency: "CLP",
            // SMM stock is unlimited; order bounds are smmMin/smmMax.
            qty: 0,
            textQty: item.textQty ?? null,
            sourceCostPrice: baseClp,
            smmApiUrl: service.providerApiUrl,
            smmServiceId: service.remoteServiceId,
            smmServiceType: service.type,
            smmCategory: service.category,
            smmRate: service.rate,
            smmMarkupPct: item.markupPct,
            smmMin: service.min,
            smmMax: service.max,
            smmRefill: service.refill,
            smmCancel: service.cancel,
            smmServiceName: service.name,
            smmSyncedAt: new Date(),
            categories:
              parsed.data.categoryIds.length > 0
                ? {
                    create: parsed.data.categoryIds.map((categoryId) => ({
                      categoryId,
                    })),
                  }
                : undefined,
          },
          select: { id: true },
        });

        results.push({ serviceId: service.id, productId: product.id });
      }

      return results;
    });

    revalidatePath("/admin/products");
    revalidatePath("/admin/services");
    return { success: true, data: { created } };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        success: false,
        message: "Conflicto de slug al crear productos. Reintenta.",
      };
    }

    return {
      success: false,
      message: "No se pudieron crear los productos.",
    };
  }
}
