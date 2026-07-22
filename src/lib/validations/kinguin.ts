import { z } from "zod";

import {
  BULK_EXPORT_SELECTION_LIMIT,
  DEFAULT_KINGUIN_MARKUP_PCT,
  DEFAULT_MARKUP_MAX_PCT,
  DEFAULT_MARKUP_MIN_PCT,
  KINGUIN_PROCESS_LIMIT,
} from "@/lib/smm-services/constants";

function emptyToUndefined(value: unknown): unknown {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }
  return value;
}

const clpPriceStringSchema = z
  .string()
  .trim()
  .regex(/^\d+([.,]\d{1,4})?$/)
  .transform((value) => value.replace(",", "."));

const chileFilterValues = ["all", "compatible", "incompatible"] as const;
const importedFilterValues = ["all", "imported", "not_imported"] as const;
const tagFilterValues = [
  "base",
  "dlc",
  "software",
  "prepaid",
  "indie valley",
] as const;

export const kinguinSearchQuerySchema = z.object({
  q: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .max(200)
      .transform((value) => value.replace(/\s+/g, " "))
      .optional(),
  ),
  page: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).default(1),
  ),
  pageSize: z.preprocess(
    emptyToUndefined,
    z.coerce
      .number()
      .int()
      .refine((value) => value === 10 || value === 20 || value === 50, {
        message: "pageSize debe ser 10, 20 o 50",
      })
      .default(20),
  ),
  /** Local Chile activation filter (applied after API results). */
  chile: z.preprocess(
    emptyToUndefined,
    z.enum(chileFilterValues).default("all"),
  ),
  platform: z.preprocess(
    emptyToUndefined,
    z.string().trim().min(1).max(80).optional(),
  ),
  regionId: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().positive().optional(),
  ),
  /** Kinguin product tag / type (API `tags`). */
  tag: z.preprocess(emptyToUndefined, z.enum(tagFilterValues).optional()),
  imported: z.preprocess(
    emptyToUndefined,
    z.enum(importedFilterValues).default("all"),
  ),
});

export type KinguinSearchQuery = z.infer<typeof kinguinSearchQuerySchema>;
export type KinguinChileFilter = (typeof chileFilterValues)[number];
export type KinguinImportedFilter = (typeof importedFilterValues)[number];
export type KinguinTagFilter = (typeof tagFilterValues)[number];

export const importKinguinProductSchema = z.object({
  kinguinId: z.coerce.number().int().positive(),
  markupPct: z.coerce
    .number()
    .min(0)
    .max(1000)
    .default(DEFAULT_KINGUIN_MARKUP_PCT),
  categoryIds: z.array(z.string().cuid()).default([]),
  name: z.preprocess(
    emptyToUndefined,
    z.string().trim().min(1).max(200).optional(),
  ),
  /** Sell price in CLP (overrides markup × cost when set). */
  price: z.preprocess(emptyToUndefined, clpPriceStringSchema.optional()),
  /** Acquisition cost in CLP (overrides EUR→CLP when set). */
  sourceCostPrice: z.preprocess(
    emptyToUndefined,
    clpPriceStringSchema.optional(),
  ),
  description: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(50000).optional(),
  ),
  activationDetails: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(10000).optional(),
  ),
  regionalLimitations: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(2000).optional(),
  ),
});

export type ImportKinguinProductInput = z.infer<
  typeof importKinguinProductSchema
>;

const kinguinPrefillHitSchema = z.object({
  kinguinId: z.coerce.number().int().positive(),
  name: z.string().trim().min(1).max(300),
  priceEur: z
    .union([z.number().min(0), z.null()])
    .optional()
    .transform((value) => value ?? null),
});

export const prefillKinguinProductsSchema = z
  .object({
    items: z
      .array(kinguinPrefillHitSchema)
      .min(1)
      .max(KINGUIN_PROCESS_LIMIT),
    minMarkupPct: z.coerce
      .number()
      .min(0)
      .max(1000)
      .default(DEFAULT_MARKUP_MIN_PCT),
    maxMarkupPct: z.coerce
      .number()
      .min(0)
      .max(1000)
      .default(DEFAULT_MARKUP_MAX_PCT),
  })
  .superRefine((data, ctx) => {
    if (data.maxMarkupPct < data.minMarkupPct) {
      ctx.addIssue({
        code: "custom",
        path: ["maxMarkupPct"],
        message: "El máximo debe ser ≥ al mínimo",
      });
    }
  });

export type PrefillKinguinProductsInput = z.infer<
  typeof prefillKinguinProductsSchema
>;

/** Price/markup only — no AI. */
export const priceKinguinProductsSchema = prefillKinguinProductsSchema;

export type PriceKinguinProductsInput = z.infer<
  typeof priceKinguinProductsSchema
>;

/** Markup range to price Kinguin hits for product-import JSON export. */
export const exportKinguinAsProductsSchema = z
  .object({
    items: z
      .array(kinguinPrefillHitSchema)
      .min(1)
      .max(BULK_EXPORT_SELECTION_LIMIT),
    minMarkupPct: z.coerce
      .number()
      .min(0)
      .max(1000)
      .default(DEFAULT_MARKUP_MIN_PCT),
    maxMarkupPct: z.coerce
      .number()
      .min(0)
      .max(1000)
      .default(DEFAULT_MARKUP_MAX_PCT),
  })
  .superRefine((data, ctx) => {
    if (data.maxMarkupPct < data.minMarkupPct) {
      ctx.addIssue({
        code: "custom",
        path: ["maxMarkupPct"],
        message: "El máximo debe ser ≥ al mínimo",
      });
    }
  });

export type ExportKinguinAsProductsInput = z.infer<
  typeof exportKinguinAsProductsSchema
>;

export const translateKinguinProductsSchema = z.object({
  kinguinIds: z
    .array(z.coerce.number().int().positive())
    .min(1)
    .max(KINGUIN_PROCESS_LIMIT),
});

export type TranslateKinguinProductsInput = z.infer<
  typeof translateKinguinProductsSchema
>;

const bulkImportItemSchema = z.object({
  kinguinId: z.coerce.number().int().positive(),
  name: z.string().trim().min(1).max(200),
  description: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(50000).optional(),
  ),
  activationDetails: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(10000).optional(),
  ),
  regionalLimitations: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(2000).optional(),
  ),
  price: clpPriceStringSchema,
  markupPct: z.coerce
    .number()
    .min(0)
    .max(1000)
    .default(DEFAULT_KINGUIN_MARKUP_PCT),
  sourceCostPrice: clpPriceStringSchema,
});

export const importKinguinProductsBulkSchema = z.object({
  items: z
    .array(bulkImportItemSchema)
    .min(1)
    .max(KINGUIN_PROCESS_LIMIT),
  categoryIds: z.array(z.string().cuid()).default([]),
});

export type ImportKinguinProductsBulkInput = z.infer<
  typeof importKinguinProductsBulkSchema
>;
