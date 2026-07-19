import { z } from "zod";

import { DeliveryMethod } from "@/generated/prisma/client";

const deliveryMethodValues = [
  DeliveryMethod.SMM,
  DeliveryMethod.KINGUIN,
  DeliveryMethod.MANUAL,
] as const;

const sortFields = [
  "relevance",
  "name",
  "price",
  "createdAt",
  "updatedAt",
] as const;

const availabilityValues = ["in_stock", "out_of_stock"] as const;

export const storeCatalogSortSchema = z.enum(sortFields);
export type StoreCatalogSortField = z.infer<typeof storeCatalogSortSchema>;

export const storeCatalogAvailabilitySchema = z.enum(availabilityValues);
export type StoreCatalogAvailability = z.infer<
  typeof storeCatalogAvailabilitySchema
>;

function emptyToUndefined(value: unknown): unknown {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }
  return value;
}

function coerceOptionalNonNegInt(value: unknown): unknown {
  const cleaned = emptyToUndefined(value);
  if (cleaned === undefined) return undefined;
  if (typeof cleaned === "string") {
    const normalized = cleaned.replace(/[^\d]/g, "");
    if (!normalized) return undefined;
    return normalized;
  }
  return cleaned;
}

/**
 * Accepts `filter=offers` (CTA) and boolean-ish `offers` query flags.
 */
function coerceOffersFlag(value: unknown): unknown {
  const cleaned = emptyToUndefined(value);
  if (cleaned === undefined) return undefined;
  if (cleaned === true || cleaned === "true" || cleaned === "1") return true;
  if (cleaned === "offers" || cleaned === "ofertas") return true;
  return undefined;
}

export const storeCatalogQuerySchema = z
  .object({
    page: z.preprocess(
      emptyToUndefined,
      z.coerce.number().int().min(1).default(1),
    ),
    pageSize: z.preprocess(
      emptyToUndefined,
      z.coerce
        .number()
        .int()
        .refine((value) => value === 12 || value === 24 || value === 48, {
          message: "pageSize debe ser 12, 24 o 48",
        })
        .default(24),
    ),
    q: z.preprocess(
      emptyToUndefined,
      z
        .string()
        .trim()
        .max(120)
        .transform((value) => value.replace(/\s+/g, " "))
        .optional(),
    ),
    category: z.preprocess(
      emptyToUndefined,
      z.string().trim().min(1).max(120).optional(),
    ),
    deliveryMethod: z.preprocess(
      emptyToUndefined,
      z.enum(deliveryMethodValues).optional(),
    ),
    availability: z.preprocess(
      emptyToUndefined,
      storeCatalogAvailabilitySchema.optional(),
    ),
    minPrice: z.preprocess(
      coerceOptionalNonNegInt,
      z.coerce.number().int().min(0).max(100_000_000).optional(),
    ),
    maxPrice: z.preprocess(
      coerceOptionalNonNegInt,
      z.coerce.number().int().min(0).max(100_000_000).optional(),
    ),
    /** Legacy/CTA alias: `/catalog?filter=offers` */
    filter: z.preprocess(emptyToUndefined, z.string().trim().optional()),
    offers: z.preprocess(coerceOffersFlag, z.boolean().optional()),
    sort: z.preprocess(
      emptyToUndefined,
      storeCatalogSortSchema.default("relevance"),
    ),
    order: z.preprocess(
      emptyToUndefined,
      z.enum(["asc", "desc"]).default("desc"),
    ),
  })
  .transform((data) => {
    const offers =
      data.offers === true ||
      data.filter === "offers" ||
      data.filter === "ofertas";

    return {
      page: data.page,
      pageSize: data.pageSize,
      q: data.q,
      category: data.category,
      deliveryMethod: data.deliveryMethod,
      availability: data.availability,
      minPrice: data.minPrice,
      maxPrice: data.maxPrice,
      offers: offers || undefined,
      sort: data.sort,
      order: data.order,
    };
  })
  .superRefine((data, ctx) => {
    if (
      data.minPrice != null &&
      data.maxPrice != null &&
      data.minPrice > data.maxPrice
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["minPrice"],
        message: "El precio mínimo no puede ser mayor al máximo",
      });
    }
  });

export type StoreCatalogQuery = z.infer<typeof storeCatalogQuerySchema>;
