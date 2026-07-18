import { z } from "zod";

import {
  DEFAULT_MARKUP_MAX_PCT,
  DEFAULT_MARKUP_MIN_PCT,
  SMM_SERVICE_SELECTION_LIMIT,
} from "@/lib/smm-services/constants";
import { servicesListQuerySchema } from "@/lib/validations/smm-providers";

function emptyToUndefined(value: unknown): unknown {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }
  return value;
}

export const selectSmmServicesForQuerySchema = z.object({
  query: servicesListQuerySchema,
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(SMM_SERVICE_SELECTION_LIMIT)
    .default(SMM_SERVICE_SELECTION_LIMIT),
});

export const prefillSmmServicesSchema = z.object({
  serviceIds: z
    .array(z.string().cuid())
    .min(1)
    .max(SMM_SERVICE_SELECTION_LIMIT),
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
}).superRefine((data, ctx) => {
  if (data.maxMarkupPct < data.minMarkupPct) {
    ctx.addIssue({
      code: "custom",
      path: ["maxMarkupPct"],
      message: "El máximo debe ser ≥ al mínimo",
    });
  }
});

export type PrefillSmmServicesInput = z.infer<typeof prefillSmmServicesSchema>;

const productDraftItemSchema = z.object({
  serviceId: z.string().cuid(),
  name: z.string().trim().min(1).max(200),
  slug: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .min(1)
      .max(120)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .optional(),
  ),
  description: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(10000).optional(),
  ),
  price: z
    .string()
    .trim()
    .regex(/^\d+([.,]\d{1,4})?$/)
    .transform((value) => value.replace(",", ".")),
  markupPct: z.coerce.number().min(0).max(1000).default(DEFAULT_MARKUP_MAX_PCT),
  textQty: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(0).optional(),
  ),
});

export const convertSmmServicesToProductsSchema = z.object({
  items: z
    .array(productDraftItemSchema)
    .min(1)
    .max(SMM_SERVICE_SELECTION_LIMIT),
  categoryIds: z.array(z.string().cuid()).default([]),
});

export type ConvertSmmServicesToProductsInput = z.infer<
  typeof convertSmmServicesToProductsSchema
>;
