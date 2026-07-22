import { z } from "zod";

import {
  DeliveryMethod,
  ProductKeyStatus,
  ProductStatus,
} from "@/generated/prisma/client";
import {
  BULK_EXPORT_SELECTION_LIMIT,
  DEFAULT_BULK_SELECTION_LIMIT,
  PRODUCT_PROCESS_LIMIT,
} from "@/lib/smm-services/constants";
import { assetsInputSchema } from "@/lib/validations/assets";

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

/** Kinguin exclusion lists can cover nearly all ISO countries (~250). */
const countryLimitationFromCsv = z.preprocess((value) => {
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
}, z.array(z.string().min(1).max(12)).max(300));

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
  countryLimitation: countryLimitationFromCsv.optional(),
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
  assets: assetsInputSchema.default([]),
  /** DB id of `SmmService` to link when deliveryMethod is SMM. */
  smmServiceDbId: z.preprocess(
    emptyToUndefined,
    z.string().cuid().optional(),
  ),
  /** Remote Kinguin id to link when deliveryMethod is KINGUIN. */
  kinguinId: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().positive().optional(),
  ),
  kinguinMarkupPct: z.preprocess(
    emptyToUndefined,
    z.coerce.number().min(0).max(1000).optional(),
  ),
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

function refineDeliveryLinks<
  T extends {
    deliveryMethod: (typeof deliveryMethodValues)[number];
    smmServiceDbId?: string;
    kinguinId?: number;
  },
>(data: T, ctx: z.RefinementCtx) {
  if (data.deliveryMethod === DeliveryMethod.KINGUIN && data.kinguinId == null) {
    ctx.addIssue({
      code: "custom",
      path: ["kinguinId"],
      message: "Selecciona un producto Kinguin para enlazar",
    });
  }
}

export const createProductSchema = z
  .object(productBaseFields)
  .superRefine(refineOfferPricing)
  .superRefine(refineDeliveryLinks);

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

export const deleteProductSchema = z.object({
  id: z.string().cuid(),
});

export const bulkDeleteProductsSchema = z.object({
  productIds: z
    .array(z.string().cuid())
    .min(1)
    .max(PRODUCT_PROCESS_LIMIT),
});

export type BulkDeleteProductsInput = z.infer<typeof bulkDeleteProductsSchema>;

export const productTranslateFieldSchema = z.enum([
  "name",
  "description",
  "platform",
  "regionalLimitations",
  "activationDetails",
  "genres",
  "languages",
]);

export const translateProductTextSchema = z.object({
  fields: z.object({
    name: z.string().max(500).optional(),
    description: z.string().max(20_000).optional(),
    platform: z.string().max(200).optional(),
    regionalLimitations: z.string().max(2000).optional(),
    activationDetails: z.string().max(5000).optional(),
    genres: z.string().max(1000).optional(),
    languages: z.string().max(1000).optional(),
  }),
  only: z.array(productTranslateFieldSchema).min(1).max(7).optional(),
  force: z.boolean().optional(),
});

export type TranslateProductTextInput = z.infer<
  typeof translateProductTextSchema
>;

export const bulkTranslateProductsSchema = z.object({
  productIds: z
    .array(z.string().cuid())
    .min(1)
    .max(PRODUCT_PROCESS_LIMIT),
  only: z.array(productTranslateFieldSchema).min(1).max(7).optional(),
  force: z.boolean().optional(),
});

export type BulkTranslateProductsInput = z.infer<
  typeof bulkTranslateProductsSchema
>;

export const bulkUpdateProductStatusSchema = z.object({
  productIds: z
    .array(z.string().cuid())
    .min(1)
    .max(PRODUCT_PROCESS_LIMIT),
  status: z.enum(productStatusValues),
});

export type BulkUpdateProductStatusInput = z.infer<
  typeof bulkUpdateProductStatusSchema
>;

export const syncKinguinProductsSchema = z.object({
  productIds: z
    .array(z.string().cuid())
    .min(1)
    .max(PRODUCT_PROCESS_LIMIT),
});

export type SyncKinguinProductsInput = z.infer<typeof syncKinguinProductsSchema>;

export const checkProductsChileCompatibilitySchema = z.object({
  productIds: z
    .array(z.string().cuid())
    .min(1)
    .max(PRODUCT_PROCESS_LIMIT),
});

export type CheckProductsChileCompatibilityInput = z.infer<
  typeof checkProductsChileCompatibilitySchema
>;

export const bulkUpdateProductCoverSchema = z.object({
  productIds: z
    .array(z.string().cuid())
    .min(1)
    .max(PRODUCT_PROCESS_LIMIT),
  coverImageUrl: z.string().url("URL inválida").max(2000),
  objectKey: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .regex(
        /^products\/[0-9]{4}-[0-9]{2}-[0-9]{2}\/[a-f0-9-]+\.[a-z0-9]+$/,
        "objectKey inválido",
      )
      .optional(),
  ),
  mimeType: z.preprocess(emptyToUndefined, z.string().max(120).optional()),
  fileName: z.preprocess(emptyToUndefined, z.string().max(255).optional()),
  sizeBytes: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().nonnegative().optional(),
  ),
});

export type BulkUpdateProductCoverInput = z.infer<
  typeof bulkUpdateProductCoverSchema
>;

export const selectProductsForQuerySchema = z.object({
  query: productsListQuerySchema,
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(BULK_EXPORT_SELECTION_LIMIT)
    .default(DEFAULT_BULK_SELECTION_LIMIT),
});

export const exportProductsSchema = z.object({
  productIds: z
    .array(z.string().cuid())
    .min(1)
    .max(BULK_EXPORT_SELECTION_LIMIT)
    .optional(),
  query: productsListQuerySchema.optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(BULK_EXPORT_SELECTION_LIMIT)
    .default(BULK_EXPORT_SELECTION_LIMIT),
}).superRefine((data, ctx) => {
  if (!data.productIds?.length && !data.query) {
    ctx.addIssue({
      code: "custom",
      message: "Indica productIds o query",
      path: ["productIds"],
    });
  }
});

export const addProductKeysSchema = z.object({
  productId: z.string().cuid(),
  codesText: z.string().min(1, "Ingresa al menos una key"),
});

export const revokeProductKeySchema = z.object({
  productId: z.string().cuid(),
  keyId: z.string().cuid(),
});

export const addProductAccountsSchema = z.object({
  productId: z.string().cuid(),
  accounts: z
    .array(
      z.object({
        label: z.preprocess(
          emptyToUndefined,
          z.string().trim().max(120).optional(),
        ),
        username: z.preprocess(
          emptyToUndefined,
          z.string().trim().max(320).optional(),
        ),
        email: z.preprocess(
          emptyToUndefined,
          z.string().trim().email("Email inválido").max(320).optional(),
        ),
        password: z.preprocess(
          emptyToUndefined,
          z.string().min(1).max(500).optional(),
        ),
        token: z.preprocess(
          emptyToUndefined,
          z.string().min(1).max(2000).optional(),
        ),
        url: z.preprocess(
          emptyToUndefined,
          z.string().trim().url("URL inválida").max(2000).optional(),
        ),
        notes: z.preprocess(
          emptyToUndefined,
          z.string().trim().max(4000).optional(),
        ),
      }),
    )
    .min(1)
    .max(100),
});

export const revokeProductAccountSchema = z.object({
  productId: z.string().cuid(),
  accountId: z.string().cuid(),
});

export const productAccountsQuerySchema = z.object({
  accountsPage: z.coerce.number().int().min(1).default(1),
  accountsPageSize: z.coerce.number().int().min(5).max(100).default(10),
  accountsStatus: z
    .enum(["AVAILABLE", "RESERVED", "SOLD", "REVOKED"])
    .optional(),
});

export type ProductAccountsQuery = z.infer<typeof productAccountsQuerySchema>;

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
