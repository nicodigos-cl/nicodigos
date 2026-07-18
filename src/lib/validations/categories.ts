import { z } from "zod";
import { assetsInputSchema } from "@/lib/validations/assets";

const sortFields = [
  "name",
  "createdAt",
  "updatedAt",
  "productsCount",
] as const;

export const categoriesSortSchema = z.enum(sortFields);
export type CategoriesSortField = z.infer<typeof categoriesSortSchema>;

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

export const categoriesListQuerySchema = z.object({
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
  parentId: z.preprocess(
    emptyToUndefined,
    z.union([z.literal("root"), z.string().cuid()]).optional(),
  ),
  sort: z.preprocess(
    emptyToUndefined,
    categoriesSortSchema.default("updatedAt"),
  ),
  order: z.preprocess(
    emptyToUndefined,
    z.enum(["asc", "desc"]).default("desc"),
  ),
});

export type CategoriesListQuery = z.infer<typeof categoriesListQuerySchema>;

const categoryBaseFields = {
  name: z.string().trim().min(1, "El nombre es obligatorio").max(200),
  slug: z
    .string()
    .trim()
    .min(1, "El slug es obligatorio")
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug inválido"),
  description: z.preprocess(
    emptyToNull,
    z.union([z.string().trim().max(2000), z.null()]).optional(),
  ),
  imageUrl: z.preprocess(
    emptyToNull,
    z.union([z.string().url("URL inválida").max(2000), z.null()]).optional(),
  ),
  parentId: z.preprocess(
    emptyToNull,
    z.union([z.string().cuid(), z.null()]).optional(),
  ),
  assets: assetsInputSchema.default([]),
};

export const createCategorySchema = z.object(categoryBaseFields);

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = z.object({
  id: z.string().cuid(),
  ...categoryBaseFields,
});

export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export const deleteCategorySchema = z.object({
  id: z.string().cuid(),
});
