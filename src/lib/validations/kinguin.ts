import { z } from "zod";

import { DEFAULT_KINGUIN_MARKUP_PCT } from "@/lib/smm-services/constants";

function emptyToUndefined(value: unknown): unknown {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }
  return value;
}

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
});

export type KinguinSearchQuery = z.infer<typeof kinguinSearchQuerySchema>;

export const importKinguinProductSchema = z.object({
  kinguinId: z.coerce.number().int().positive(),
  markupPct: z.coerce
    .number()
    .min(0)
    .max(1000)
    .default(DEFAULT_KINGUIN_MARKUP_PCT),
  categoryIds: z.array(z.string().cuid()).default([]),
});

export type ImportKinguinProductInput = z.infer<
  typeof importKinguinProductSchema
>;
