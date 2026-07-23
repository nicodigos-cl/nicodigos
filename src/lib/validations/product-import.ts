import { z } from "zod";

import { SMM_SERVICE_PROCESS_LIMIT } from "@/lib/smm-services/constants";
import { assetsInputSchema } from "@/lib/validations/assets";

export const PRODUCT_IMPORT_LIMIT = 100;

/** String enums — avoid importing Prisma client into browser bundles. */
const deliveryMethodValues = ["MANUAL", "SMM", "KINGUIN"] as const;
const productStatusValues = ["DRAFT", "ACTIVE", "ARCHIVED"] as const;

function emptyToUndefined(value: unknown): unknown {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }
  return value;
}

const priceSchema = z
  .union([z.string(), z.number()])
  .transform((value) => String(value).trim().replace(",", "."))
  .pipe(z.string().regex(/^\d+(\.\d{1,4})?$/, "Monto inválido"));

const stringArraySchema = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return undefined;
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter((item) => item.length > 0);
  }
  if (typeof value === "string") {
    return value
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }
  return undefined;
}, z.array(z.string().min(1).max(120)).max(50).optional());

export const importProductItemSchema = z.object({
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
    z.string().trim().max(50000).optional(),
  ),
  price: priceSchema,
  deliveryMethod: z.preprocess(
    emptyToUndefined,
    z.enum(deliveryMethodValues).default("MANUAL"),
  ),
  status: z.preprocess(
    emptyToUndefined,
    z.enum(productStatusValues).default("DRAFT"),
  ),
  qty: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(0).default(0),
  ),
  currency: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .min(3)
      .max(3)
      .transform((value) => value.toUpperCase())
      .default("CLP"),
  ),
  compareAtPrice: z.preprocess(emptyToUndefined, priceSchema.optional()),
  sourceCostPrice: z.preprocess(emptyToUndefined, priceSchema.optional()),
  coverImageUrl: z.preprocess(
    emptyToUndefined,
    z.string().url().max(2000).optional(),
  ),
  textQty: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(0).optional(),
  ),
  /** Translated / catalog text fields (same set as PRODUCT_TRANSLATE_FIELDS). */
  platform: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(120).optional(),
  ),
  regionalLimitations: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(2000).optional(),
  ),
  activationDetails: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(10000).optional(),
  ),
  genres: stringArraySchema,
  languages: stringArraySchema,
  developers: stringArraySchema,
  publishers: stringArraySchema,
  tags: stringArraySchema,
  originalName: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(300).optional(),
  ),
  assets: assetsInputSchema.optional().default([]),
  /** SMM panel wiring (required for fulfillment when deliveryMethod=SMM). */
  smmApiUrl: z.preprocess(
    emptyToUndefined,
    z.string().trim().url().max(2000).optional(),
  ),
  smmServiceId: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().positive().optional(),
  ),
  smmServiceType: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(120).optional(),
  ),
  smmCategory: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(200).optional(),
  ),
  smmRate: z.preprocess(emptyToUndefined, priceSchema.optional()),
  smmMarkupPct: z.preprocess(
    emptyToUndefined,
    z.coerce.number().min(0).max(1000).optional(),
  ),
  smmMin: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(0).optional(),
  ),
  smmMax: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(0).optional(),
  ),
  smmRefill: z.preprocess(emptyToUndefined, z.coerce.boolean().optional()),
  smmCancel: z.preprocess(emptyToUndefined, z.coerce.boolean().optional()),
  smmServiceName: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(300).optional(),
  ),
  /** Remote Kinguin id — required to mark the catalog row as already imported. */
  kinguinId: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().positive().optional(),
  ),
  kinguinProductId: z.preprocess(
    emptyToUndefined,
    z.string().trim().min(1).max(120).optional(),
  ),
  kinguinMarkupPct: z.preprocess(
    emptyToUndefined,
    z.coerce.number().min(0).max(1000).optional(),
  ),
});

export type ImportProductItem = z.infer<typeof importProductItemSchema>;

export const importProductsSchema = z
  .object({
    items: z.array(importProductItemSchema).min(1).max(PRODUCT_IMPORT_LIMIT),
    categoryIds: z.array(z.string().cuid()).default([]),
  })
  .superRefine((data, ctx) => {
    data.items.forEach((item, index) => {
      if (item.deliveryMethod === "KINGUIN" && item.kinguinId == null) {
        ctx.addIssue({
          code: "custom",
          path: ["items", index, "kinguinId"],
          message: "Producto Kinguin sin kinguinId",
        });
      }
    });
  });

export type ImportProductsInput = z.infer<typeof importProductsSchema>;

/** Shape exported by `exportServicesAsJson` (and tolerant variants). */
export const exportedSmmServiceSchema = z.object({
  id: z.preprocess(emptyToUndefined, z.string().cuid().optional()),
  providerId: z.preprocess(emptyToUndefined, z.string().cuid().optional()),
  providerApiUrl: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  remoteServiceId: z.coerce.number().int().positive(),
  name: z.string().trim().min(1).optional(),
  type: z.string().optional(),
  category: z.string().optional(),
  rate: z.union([z.string(), z.number()]).optional(),
  min: z.coerce.number().int().optional(),
  max: z.coerce.number().int().optional(),
  refill: z.coerce.boolean().optional(),
  cancel: z.coerce.boolean().optional(),
  isActive: z.coerce.boolean().optional(),
});

export type ExportedSmmService = z.infer<typeof exportedSmmServiceSchema>;

export const resolveExportedSmmServicesSchema = z.object({
  services: z
    .array(exportedSmmServiceSchema)
    .min(1)
    .max(SMM_SERVICE_PROCESS_LIMIT),
});

export type ResolveExportedSmmServicesInput = z.infer<
  typeof resolveExportedSmmServicesSchema
>;
