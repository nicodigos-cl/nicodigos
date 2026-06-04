import { z } from "zod";
import { parseYoutubeVideoId } from "@/lib/youtube";

const imageUrlSchema = z
  .string()
  .trim()
  .min(1, "La URL es obligatoria")
  .url("URL inválida");

export const productImageInputSchema = z.object({
  url: imageUrlSchema,
  thumbnailUrl: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : undefined)),
  sortOrder: z.coerce.number().int().min(0),
  isCover: z.boolean(),
});

export const productVideoInputSchema = z.object({
  youtubeVideoId: z
    .string()
    .trim()
    .min(1, "El ID o URL de YouTube es obligatorio")
    .transform((value, ctx) => {
      const id = parseYoutubeVideoId(value);
      if (!id) {
        ctx.addIssue({
          code: "custom",
          message: "URL o ID de YouTube no válido",
        });
        return z.NEVER;
      }
      return id;
    }),
  title: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : undefined)),
  sortOrder: z.coerce.number().int().min(0),
});

const stringListSchema = z.array(z.string().trim()).default([]);

export const systemRequirementInputSchema = z.object({
  system: z.string().trim().min(1, "Indica el sistema (Windows, Mac, etc.)"),
  requirement: z
    .array(z.string().trim().min(1))
    .min(1, "Añade al menos un requisito por línea"),
});

export type SystemRequirementInput = z.infer<
  typeof systemRequirementInputSchema
>;

export const updateProductSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  description: z
    .string()
    .transform((value) => value.trim())
    .optional(),
  platform: z.string().trim().min(1, "La plataforma es obligatoria"),
  sellPrice: z.coerce
    .number()
    .int("El precio debe ser un entero en pesos")
    .positive("El precio de venta debe ser mayor a 0"),
  costPrice: z.coerce
    .number()
    .int("El precio debe ser un entero en pesos")
    .nonnegative("El costo no puede ser negativo"),
  qty: z.coerce.number().int().nonnegative(),
  isActive: z.boolean(),
  isOffer: z.boolean(),
  isFeatured: z.boolean(),
  isPreorder: z.boolean(),
  regionalLimitations: z.string().trim().optional(),
  activationDetails: z.string().trim().optional(),
  countryLimitations: stringListSchema,
  languages: stringListSchema,
  images: z.array(productImageInputSchema).max(24, "Máximo 24 imágenes"),
  videos: z.array(productVideoInputSchema).max(12, "Máximo 12 trailers"),
  systemRequirements: z
    .array(systemRequirementInputSchema)
    .max(12, "Máximo 12 bloques de requisitos"),
});

export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductImageInput = z.infer<typeof productImageInputSchema>;
export type ProductVideoInput = z.infer<typeof productVideoInputSchema>;
