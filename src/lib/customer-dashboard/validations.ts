import { z } from "zod";

import {
  deliveryMethodValues,
  deliveryStatusValues,
} from "@/lib/validations/deliveries";
import { orderStatusValues } from "@/lib/validations/orders";
import { isValidRut, normalizeRut } from "@/lib/validations/rut";
import { invoiceDocumentTypeValues } from "@/lib/validations/users";

function emptyToUndefined(value: unknown): unknown {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }
  return value;
}

export const customerOrdersListQuerySchema = z.object({
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
        message: "pageSize inválido",
      })
      .default(10),
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
    z.enum(orderStatusValues).optional(),
  ),
  from: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .refine((value) => !Number.isNaN(Date.parse(value)), "Fecha inválida")
      .optional(),
  ),
  to: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .refine((value) => !Number.isNaN(Date.parse(value)), "Fecha inválida")
      .optional(),
  ),
});

export type CustomerOrdersListQuery = z.infer<
  typeof customerOrdersListQuerySchema
>;

export const customerDeliveriesFilterValues = [
  "all",
  "available",
  "processing",
  "completed",
  "problems",
  "keys",
  "accounts",
  "smm",
] as const;

export const customerDeliveriesListQuerySchema = z.object({
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
        message: "pageSize inválido",
      })
      .default(10),
  ),
  filter: z.preprocess(
    emptyToUndefined,
    z.enum(customerDeliveriesFilterValues).default("all"),
  ),
  status: z.preprocess(
    emptyToUndefined,
    z.enum(deliveryStatusValues).optional(),
  ),
  method: z.preprocess(
    emptyToUndefined,
    z.enum(deliveryMethodValues).optional(),
  ),
});

export type CustomerDeliveriesListQuery = z.infer<
  typeof customerDeliveriesListQuerySchema
>;

export const customerTransactionsListQuerySchema = z.object({
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
        message: "pageSize inválido",
      })
      .default(10),
  ),
});

export type CustomerTransactionsListQuery = z.infer<
  typeof customerTransactionsListQuerySchema
>;

export const retryPaymentSchema = z.object({
  orderId: z.string().cuid(),
});

export const submitSmmTargetSchema = z.object({
  deliveryId: z.string().cuid(),
  link: z
    .string()
    .trim()
    .url("Ingresa una URL válida")
    .max(2000),
});

export const updateCustomerProfileSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(120),
  phone: z
    .string()
    .trim()
    .max(40)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
});

export const updateCustomerBillingSchema = z
  .object({
    rut: z
      .string()
      .trim()
      .max(20)
      .optional()
      .transform((value) => {
        if (!value) return null;
        return normalizeRut(value);
      }),
    invoiceType: z.enum(invoiceDocumentTypeValues),
    businessName: z
      .string()
      .trim()
      .max(200)
      .optional()
      .transform((value) => (value && value.length > 0 ? value : null)),
    businessActivity: z
      .string()
      .trim()
      .max(200)
      .optional()
      .transform((value) => (value && value.length > 0 ? value : null)),
    addressLine1: z
      .string()
      .trim()
      .max(200)
      .optional()
      .transform((value) => (value && value.length > 0 ? value : null)),
    addressLine2: z
      .string()
      .trim()
      .max(200)
      .optional()
      .transform((value) => (value && value.length > 0 ? value : null)),
    commune: z
      .string()
      .trim()
      .max(120)
      .optional()
      .transform((value) => (value && value.length > 0 ? value : null)),
    city: z
      .string()
      .trim()
      .max(120)
      .optional()
      .transform((value) => (value && value.length > 0 ? value : null)),
    region: z
      .string()
      .trim()
      .max(120)
      .optional()
      .transform((value) => (value && value.length > 0 ? value : null)),
  })
  .superRefine((data, ctx) => {
    if (data.rut && !isValidRut(data.rut)) {
      ctx.addIssue({
        code: "custom",
        path: ["rut"],
        message: "RUT inválido",
      });
    }
    if (data.invoiceType === "FACTURA") {
      if (!data.rut) {
        ctx.addIssue({
          code: "custom",
          path: ["rut"],
          message: "El RUT es obligatorio para factura",
        });
      }
      if (!data.businessName) {
        ctx.addIssue({
          code: "custom",
          path: ["businessName"],
          message: "La razón social es obligatoria para factura",
        });
      }
      if (!data.businessActivity) {
        ctx.addIssue({
          code: "custom",
          path: ["businessActivity"],
          message: "El giro es obligatorio para factura",
        });
      }
    }
  });

export const resendDeliveryEmailSchema = z.object({
  deliveryId: z.string().cuid(),
});

export const createSupportRequestSchema = z.object({
  subject: z.string().trim().min(3).max(160),
  message: z.string().trim().min(10).max(4000),
  orderId: z.preprocess(
    emptyToUndefined,
    z.string().cuid().optional(),
  ),
  deliveryId: z.preprocess(
    emptyToUndefined,
    z.string().cuid().optional(),
  ),
  category: z.preprocess(
    emptyToUndefined,
    z
      .enum([
        "payment",
        "delivery",
        "smm",
        "account",
        "billing",
        "other",
      ])
      .default("other"),
  ),
});

export const revokeSessionSchema = z.object({
  sessionId: z.string().min(1).max(128),
});

export const buyAgainSchema = z.object({
  productId: z.string().cuid(),
});
