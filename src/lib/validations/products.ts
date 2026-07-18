import { z } from "zod";

import {
  DeliveryMethod,
  ProductKeyStatus,
  ProductStatus,
} from "@/generated/prisma/client";

const productStatusValues = [
  ProductStatus.DRAFT,
  ProductStatus.ACTIVE,
  ProductStatus.ARCHIVED,
] as const;

const deliveryMethodValues = [
  DeliveryMethod.SMM,
  DeliveryMethod.KINGUIN,
  DeliveryMethod.MANUAL,
] as const;

const productKeyStatusValues = [
  ProductKeyStatus.AVAILABLE,
  ProductKeyStatus.RESERVED,
  ProductKeyStatus.SOLD,
  ProductKeyStatus.REVOKED,
] as const;

const sortFields = [
  "name",
  "price",
  "qty",
  "status",
  "createdAt",
  "updatedAt",
] as const;

export const productsSortSchema = z.enum(sortFields);
export type ProductsSortField = z.infer<typeof productsSortSchema>;

function emptyToUndefined(value: unknown): unknown {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }
  return value;
}

function emptyToNull(value: unknown): unknown {
  if (value === "" || value === null || value === undefined) {
    return null;
  }
  return value;
}

const decimalStringSchema = z
  .string()
  .trim()
  .regex(/^\d+([.,]\d{1,4})?$/, "Monto inválido")
  .transform((value) => value.replace(",", "."));

const optionalDecimalStringSchema = z.preprocess(
  emptyToNull,
  z
    .union([
      z
        .string()
        .trim()
        .regex(/^\d+([.,]\d{1,4})?$/, "Monto inválido")
        .transform((value) => value.replace(",", ".")),
      z.null(),
    ])
    .optional(),
);

const optionalIntSchema = z.preprocess(
  emptyToNull,
  z.union([z.coerce.number().int(), z.null()]).optional(),
);

const stringArrayFromCsv = z.preprocess((value) => {
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

  return [];
}, z.array(z.string().min(1).max(120)).max(50));

export const productsListQuerySchema = z.object({
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
  status: z.preprocess(
    emptyToUndefined,
    z.enum(productStatusValues).optional(),
  ),
  deliveryMethod: z.preprocess(
    emptyToUndefined,
    z.enum(deliveryMethodValues).optional(),
  ),
  sort: z.preprocess(
    emptyToUndefined,
    productsSortSchema.default("updatedAt"),
  ),
  order: z.preprocess(
    emptyToUndefined,
    z.enum(["asc", "desc"]).default("desc"),
  ),
});

export type ProductsListQuery = z.infer<typeof productsListQuerySchema>;

export const productKeysQuerySchema = z.object({
  keysPage: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).default(1),
  ),
  keysPageSize: z.preprocess(
    emptyToUndefined,
    z.coerce
      .number()
      .int()
      .refine((value) => value === 10 || value === 20 || value === 50, {
        message: "keysPageSize debe ser 10, 20 o 50",
      })
      .default(10),
  ),
  keysQuery: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(200).optional(),
  ),
  keysStatus: z.preprocess(
    emptyToUndefined,
    z.enum(productKeyStatusValues).optional(),
  ),
});

export type ProductKeysQuery = z.infer<typeof productKeysQuerySchema>;

const productBaseFields = {
  name: z.string().trim().min(1, "El nombre es obligatorio").max(200),
  slug: z
    .string()
    .trim()
    .min(1, "El slug es obligatorio")
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug inválido"),
  description: z.preprocess(
    emptyToNull,
    z.union([z.string().trim().max(10000), z.null()]).optional(),
  ),
  coverImageUrl: z.preprocess(
    emptyToNull,
    z.union([z.string().url("URL inválida").max(2000), z.null()]).optional(),
  ),
  status: z.enum(productStatusValues),
  deliveryMethod: z.enum(deliveryMethodValues),
  price: decimalStringSchema,
  compareAtPrice: optionalDecimalStringSchema,
  currency: z.string().trim().min(3).max(3).default("CLP"),
  qty: z.coerce.number().int().min(0).default(0),
  textQty: optionalIntSchema,
  isFeatured: z.coerce.boolean().default(false),
  isOffer: z.coerce.boolean().default(false),
  isPreorder: z.coerce.boolean().default(false),
  regionId: optionalIntSchema,
  regionalLimitations: z.preprocess(
    emptyToNull,
    z.union([z.string().trim().max(500), z.null()]).optional(),
  ),
  countryLimitation: stringArrayFromCsv.optional(),
  activationDetails: z.preprocess(
    emptyToNull,
    z.union([z.string().trim().max(5000), z.null()]).optional(),
  ),
  releaseDate: z.preprocess(emptyToNull, z.union([z.string(), z.null()]).optional()),
  ageRating: z.preprocess(
    emptyToNull,
    z.union([z.string().trim().max(50), z.null()]).optional(),
  ),
  platform: z.preprocess(
    emptyToNull,
    z.union([z.string().trim().max(120), z.null()]).optional(),
  ),
  genres: stringArrayFromCsv.optional(),
  languages: stringArrayFromCsv.optional(),
  developers: stringArrayFromCsv.optional(),
  publishers: stringArrayFromCsv.optional(),
  tags: stringArrayFromCsv.optional(),
  sourceCostPrice: optionalDecimalStringSchema,
  categoryIds: z.array(z.string().cuid()).default([]),
};

function refineOfferPricing<
  T extends {
    isOffer: boolean;
    price: string;
    compareAtPrice?: string | null;
  },
>(data: T, ctx: z.RefinementCtx) {
  if (data.isOffer) {
    if (data.compareAtPrice == null || data.compareAtPrice === "") {
      ctx.addIssue({
        code: "custom",
        path: ["compareAtPrice"],
        message: "Con oferta activa debes indicar el precio base",
      });
    }
  }
}

export const createProductSchema = z
  .object(productBaseFields)
  .superRefine(refineOfferPricing);

export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = z
  .object({
    id: z.string().cuid(),
    ...productBaseFields,
  })
  .superRefine(refineOfferPricing);

export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const archiveProductSchema = z.object({
  id: z.string().cuid(),
});

export const addProductKeysSchema = z.object({
  productId: z.string().cuid(),
  codesText: z.string().min(1, "Ingresa al menos una key"),
});

export const revokeProductKeySchema = z.object({
  productId: z.string().cuid(),
  keyId: z.string().cuid(),
});

export const addProductImageSchema = z.object({
  productId: z.string().cuid(),
  url: z.string().url("URL inválida").max(2000),
  thumbnailUrl: z.preprocess(
    emptyToNull,
    z.union([z.string().url().max(2000), z.null()]).optional(),
  ),
  setAsCover: z.coerce.boolean().default(false),
});

export const removeProductImageSchema = z.object({
  productId: z.string().cuid(),
  imageId: z.string().cuid(),
});

export const reorderProductImagesSchema = z.object({
  productId: z.string().cuid(),
  imageIds: z.array(z.string().cuid()).min(1),
});

export const setCoverImageSchema = z.object({
  productId: z.string().cuid(),
  imageId: z.string().cuid().optional(),
  coverImageUrl: z.preprocess(
    emptyToNull,
    z.union([z.string().url().max(2000), z.null()]).optional(),
  ),
});

export function parseSearchParamsRecord(
  params: Record<string, string | string[] | undefined>,
): Record<string, string | undefined> {
  const result: Record<string, string | undefined> = {};

  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      result[key] = value[0];
    } else {
      result[key] = value;
    }
  }

  return result;
}
