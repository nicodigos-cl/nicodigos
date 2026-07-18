import { z } from "zod";

export const deliveryStatusValues = [
  "PENDING",
  "PROCESSING",
  "DELIVERED",
  "FAILED",
  "CANCELED",
] as const;

export const deliveryMethodValues = ["SMM", "KINGUIN", "MANUAL"] as const;

export const deliveryContentTypeValues = [
  "PRODUCT_KEY",
  "CODE",
  "PIN",
  "USERNAME_PASSWORD",
  "EMAIL_PASSWORD",
  "TOKEN",
  "URL",
  "INSTRUCTIONS",
  "FREE_TEXT",
  "OTHER",
] as const;

export type DeliveryStatus = (typeof deliveryStatusValues)[number];
export type DeliveryMethod = (typeof deliveryMethodValues)[number];
export type DeliveryContentType = (typeof deliveryContentTypeValues)[number];

const sortFields = ["createdAt", "updatedAt"] as const;
export const deliveriesSortSchema = z.enum(sortFields);
export type DeliveriesSortField = z.infer<typeof deliveriesSortSchema>;

function emptyToUndefined(value: unknown): unknown {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }
  return value;
}

function boolFromSearch(value: unknown): unknown {
  if (value === "" || value === null || value === undefined) return undefined;
  if (value === true || value === "true" || value === "1") return true;
  if (value === false || value === "false" || value === "0") return false;
  return value;
}

export const deliveriesListQuerySchema = z.object({
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
    z.enum(deliveryStatusValues).optional(),
  ),
  method: z.preprocess(
    emptyToUndefined,
    z.enum(deliveryMethodValues).optional(),
  ),
  hasError: z.preprocess(boolFromSearch, z.boolean().optional()),
  needsManual: z.preprocess(boolFromSearch, z.boolean().optional()),
  hasExternal: z.preprocess(boolFromSearch, z.boolean().optional()),
  from: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .refine((value) => !Number.isNaN(Date.parse(value)), {
        message: "Fecha desde inválida",
      })
      .optional(),
  ),
  to: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .refine((value) => !Number.isNaN(Date.parse(value)), {
        message: "Fecha hasta inválida",
      })
      .optional(),
  ),
  sort: z.preprocess(
    emptyToUndefined,
    deliveriesSortSchema.default("createdAt"),
  ),
  order: z.preprocess(
    emptyToUndefined,
    z.enum(["asc", "desc"]).default("desc"),
  ),
});

export type DeliveriesListQuery = z.infer<typeof deliveriesListQuerySchema>;

export const deliveryStatusLabel: Record<DeliveryStatus, string> = {
  PENDING: "Pendiente",
  PROCESSING: "Procesando",
  DELIVERED: "Entregada",
  FAILED: "Fallida",
  CANCELED: "Cancelada",
};

export const deliveryMethodLabel: Record<DeliveryMethod, string> = {
  MANUAL: "Manual",
  SMM: "SMM",
  KINGUIN: "Kinguin",
};

export const deliveryContentTypeLabel: Record<DeliveryContentType, string> = {
  PRODUCT_KEY: "Product key",
  CODE: "Código",
  PIN: "PIN",
  USERNAME_PASSWORD: "Usuario y contraseña",
  EMAIL_PASSWORD: "Email y contraseña",
  TOKEN: "Token",
  URL: "URL / enlace",
  INSTRUCTIONS: "Instrucciones",
  FREE_TEXT: "Texto libre",
  OTHER: "Otro",
};

const manualKeyItemSchema = z.object({
  contentType: z.enum(deliveryContentTypeValues).default("PRODUCT_KEY"),
  label: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(120).optional(),
  ),
  serial: z.string().trim().min(1, "Valor requerido").max(2000),
  instructions: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(4000).optional(),
  ),
  isSecret: z.boolean().default(true),
  productKeyId: z.preprocess(
    emptyToUndefined,
    z.string().cuid().optional(),
  ),
});

const manualCredentialItemSchema = z.object({
  contentType: z
    .enum(deliveryContentTypeValues)
    .default("USERNAME_PASSWORD"),
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
  instructions: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(4000).optional(),
  ),
  isSecret: z.boolean().default(true),
});

export const saveManualDeliverySchema = z.object({
  deliveryId: z.string().cuid(),
  customerMessage: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(4000).optional(),
  ),
  keys: z.array(manualKeyItemSchema).max(100).default([]),
  credentials: z.array(manualCredentialItemSchema).max(50).default([]),
  replaceExisting: z.boolean().default(false),
  autoAssignKeys: z.boolean().default(false),
  productKeyIds: z.array(z.string().cuid()).max(100).default([]),
});

export type SaveManualDeliveryInput = z.infer<typeof saveManualDeliverySchema>;

export const completeManualDeliverySchema = saveManualDeliverySchema.extend({
  allowUnpaidOverride: z.boolean().default(false),
});

export const deliveryIdSchema = z.object({
  deliveryId: z.string().cuid("Entrega inválida"),
});

export const markDeliveryFailedSchema = deliveryIdSchema.extend({
  errorMessage: z
    .string()
    .trim()
    .min(1, "Describe el error")
    .max(2000),
});

export const adminMessageSchema = deliveryIdSchema.extend({
  message: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(2000).optional(),
  ),
});

export const resendDeliveryEmailSchema = deliveryIdSchema.extend({
  type: z
    .enum(["COMPLETED", "FAILED", "PROCESSING"])
    .default("COMPLETED"),
});

export const revealDeliverySecretSchema = z.object({
  deliveryId: z.string().cuid(),
  kind: z.enum(["key", "credential"]),
  itemId: z.string().cuid(),
  field: z.enum(["serial", "password", "token"]).optional(),
});
