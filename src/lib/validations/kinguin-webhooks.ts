import { z } from "zod";

/** `X-Event-Name` values from Kinguin-eCommerce-API + legacy panel `order.complete`. */
export const kinguinWebhookEventNameSchema = z.enum([
  "product.update",
  "order.status",
  "order.complete",
]);

export type KinguinWebhookEventName = z.infer<
  typeof kinguinWebhookEventNameSchema
>;

export const kinguinWebhookOrderStatusSchema = z.object({
  orderId: z.string().trim().min(1).max(128),
  orderExternalId: z
    .string()
    .trim()
    .min(1)
    .max(128)
    .optional()
    .nullable()
    .transform((value) => value || undefined),
  status: z.string().trim().min(1).max(64).optional(),
  updatedAt: z.string().trim().min(1).max(64).optional(),
});

export type KinguinWebhookOrderStatusInput = z.infer<
  typeof kinguinWebhookOrderStatusSchema
>;

export const kinguinWebhookProductUpdateSchema = z.object({
  kinguinId: z.coerce.number().int().positive(),
  productId: z.string().trim().min(1).max(128),
  qty: z.coerce.number().int().nonnegative().optional(),
  textQty: z.coerce.number().int().nonnegative().optional(),
  cheapestOfferId: z.array(z.string().trim().min(1)).optional(),
  updatedAt: z.string().trim().min(1).max(64).optional(),
});

export type KinguinWebhookProductUpdateInput = z.infer<
  typeof kinguinWebhookProductUpdateSchema
>;
