import { z } from "zod";

import { SmmProviderStatus } from "@/generated/prisma/client";

const providerStatusValues = [
  SmmProviderStatus.ACTIVE,
  SmmProviderStatus.INACTIVE,
  SmmProviderStatus.ERROR,
] as const;

const sortFields = [
  "name",
  "status",
  "createdAt",
  "updatedAt",
  "lastSyncedAt",
] as const;

export const providersSortSchema = z.enum(sortFields);
export type ProvidersSortField = z.infer<typeof providersSortSchema>;

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

export const providersListQuerySchema = z.object({
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
  status: z.preprocess(
    emptyToUndefined,
    z.enum(providerStatusValues).optional(),
  ),
  sort: z.preprocess(
    emptyToUndefined,
    providersSortSchema.default("updatedAt"),
  ),
  order: z.preprocess(
    emptyToUndefined,
    z.enum(["asc", "desc"]).default("desc"),
  ),
});

export type ProvidersListQuery = z.infer<typeof providersListQuerySchema>;

export const providerServicesQuerySchema = z.object({
  servicesPage: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).default(1),
  ),
  servicesPageSize: z.preprocess(
    emptyToUndefined,
    z.coerce
      .number()
      .int()
      .refine((value) => value === 10 || value === 20 || value === 50, {
        message: "servicesPageSize debe ser 10, 20 o 50",
      })
      .default(20),
  ),
  servicesQuery: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(200).optional(),
  ),
  servicesCategory: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(200).optional(),
  ),
});

export type ProviderServicesQuery = z.infer<typeof providerServicesQuerySchema>;

const servicesSortFields = [
  "name",
  "category",
  "rate",
  "remoteServiceId",
  "updatedAt",
  "createdAt",
] as const;

export const servicesSortSchema = z.enum(servicesSortFields);
export type ServicesSortField = z.infer<typeof servicesSortSchema>;

export const servicesListQuerySchema = z.object({
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
      .max(200)
      .transform((value) => value.replace(/\s+/g, " "))
      .optional(),
  ),
  providerId: z.preprocess(emptyToUndefined, z.string().cuid().optional()),
  category: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(200).optional(),
  ),
  isActive: z.preprocess(emptyToUndefined, z.enum(["true", "false"]).optional()),
  sort: z.preprocess(emptyToUndefined, servicesSortSchema.default("updatedAt")),
  order: z.preprocess(
    emptyToUndefined,
    z.enum(["asc", "desc"]).default("desc"),
  ),
});

export type ServicesListQuery = z.infer<typeof servicesListQuerySchema>;

export const deleteSmmServiceSchema = z.object({
  id: z.string().cuid(),
});

const providerBaseFields = {
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
  apiUrl: z.string().trim().url("URL de API inválida").max(2000),
  status: z.enum(providerStatusValues),
  isDefault: z.coerce.boolean().default(false),
};

export const createSmmProviderSchema = z.object({
  ...providerBaseFields,
  apiKey: z.string().trim().min(1, "La API key es obligatoria").max(500),
});

export type CreateSmmProviderInput = z.infer<typeof createSmmProviderSchema>;

export const updateSmmProviderSchema = z.object({
  id: z.string().cuid(),
  ...providerBaseFields,
  /** Vacío = conservar la key actual. */
  apiKey: z.preprocess(
    emptyToUndefined,
    z.string().trim().min(1).max(500).optional(),
  ),
});

export type UpdateSmmProviderInput = z.infer<typeof updateSmmProviderSchema>;

export const deleteSmmProviderSchema = z.object({
  id: z.string().cuid(),
});

export const syncSmmProviderSchema = z.object({
  id: z.string().cuid(),
});

export function maskApiKey(apiKey: string): string {
  const trimmed = apiKey.trim();
  if (trimmed.length <= 4) {
    return "••••";
  }
  return `••••••••${trimmed.slice(-4)}`;
}
