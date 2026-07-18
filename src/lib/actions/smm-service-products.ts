"use server";

import { revalidatePath } from "next/cache";
import { flattenError } from "zod";

import { DeliveryMethod, Prisma, ProductStatus } from "@/generated/prisma/client";
import type { ActionResult } from "@/lib/actions/types";
import { requireSession } from "@/lib/auth/session";
import { applyMarkupPct, getUsdToClpRate, usdToClp } from "@/lib/fx/usd-clp";
import { createStructuredResponse } from "@/lib/openai/client";
import prisma from "@/lib/prisma";
import { slugify } from "@/lib/products/format";
import {
  getSmmServiceIdsForQuery,
  getSmmServicesByIds,
} from "@/lib/smm-providers/queries";
import { SMM_SERVICE_SELECTION_LIMIT } from "@/lib/smm-services/constants";
import {
  convertSmmServicesToProductsSchema,
  prefillSmmServicesSchema,
  selectSmmServicesForQuerySchema,
} from "@/lib/validations/smm-service-products";
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

function clampMarkup(
  value: number,
  min: number,
  max: number,
): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
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
        descriptionEs: string;
        markupPct: number;
      }>;
    };

    const ai = await createStructuredResponse<AiPayload>({
      schemaName: "smm_service_product_prefill",
      instructions: [
        "Eres un copywriter de ecommerce en Chile.",
        "Traduce nombres de servicios SMM al español (neutro latinoamericano) y genera una descripción corta (1-2 frases) en español.",
        `Para cada servicio elige un markupPct entero aleatorio entre ${minMarkupPct} y ${maxMarkupPct} (inclusive).`,
        "No inventes IDs: usa exactamente los serviceId recibidos.",
        "Responde solo con el JSON estructurado solicitado.",
      ].join(" "),
      input: JSON.stringify({
        minMarkupPct,
        maxMarkupPct,
        services: services.map((service) => ({
          serviceId: service.id,
          name: service.name,
          type: service.type,
          category: service.category,
          rateUsd: service.rate,
          min: service.min,
          max: service.max,
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
              required: ["serviceId", "nameEs", "descriptionEs", "markupPct"],
              properties: {
                serviceId: { type: "string" },
                nameEs: { type: "string" },
                descriptionEs: { type: "string" },
                markupPct: { type: "number" },
              },
            },
          },
        },
      },
    });

    const byId = new Map(services.map((service) => [service.id, service]));
    const usdClpRate = await getUsdToClpRate();
    const items: PrefillServiceItem[] = [];

    for (const row of ai.items) {
      const service = byId.get(row.serviceId);
      if (!service) continue;

      const rateUsd = Number.parseFloat(service.rate) || 0;
      const baseClp = await usdToClp(rateUsd);
      const markupPct = clampMarkup(row.markupPct, minMarkupPct, maxMarkupPct);

      items.push({
        serviceId: service.id,
        nameEs: row.nameEs.trim() || service.name,
        descriptionEs: row.descriptionEs.trim(),
        markupPct,
        priceClp: applyMarkupPct(baseClp, markupPct),
        rateUsd,
        baseClp,
      });
    }

    if (items.length === 0) {
      return {
        success: false,
        message: "La IA no devolvió items utilizables.",
      };
    }

    return { success: true, data: { items, usdClpRate } };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al llamar a OpenAI";
    return { success: false, message };
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

  if (parsed.data.items.length > SMM_SERVICE_SELECTION_LIMIT) {
    return {
      success: false,
      message: `Máximo ${SMM_SERVICE_SELECTION_LIMIT} servicios por operación.`,
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
    const created = await prisma.$transaction(async (tx) => {
      const results: Array<{ serviceId: string; productId: string }> = [];

      for (const item of parsed.data.items) {
        const service = serviceById.get(item.serviceId);
        if (!service) {
          throw new Error("SERVICE_NOT_FOUND");
        }

        const slug =
          item.slug ?? (await uniqueSlug(tx, item.name || service.name));

        const product = await tx.product.create({
          data: {
            name: item.name,
            slug,
            description: item.description ?? null,
            status: ProductStatus.DRAFT,
            deliveryMethod: DeliveryMethod.SMM,
            price: item.price,
            currency: "CLP",
            qty: 0,
            textQty: item.textQty ?? service.min,
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
