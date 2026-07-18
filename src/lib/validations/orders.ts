import { z } from "zod";

export const orderStatusValues = [
  "PENDING",
  "PAID",
  "PROCESSING",
  "FULFILLED",
  "PARTIALLY_FULFILLED",
  "CANCELED",
  "REFUNDED",
] as const;

export const paymentStatusValues = [
  "PENDING",
  "PAID",
  "FAILED",
  "REFUNDED",
] as const;

export const deliveryMethodValues = ["SMM", "KINGUIN", "MANUAL"] as const;

export const paymentProviderValues = ["MANUAL", "FLOW", "OTHER"] as const;

export type OrderStatus = (typeof orderStatusValues)[number];
export type PaymentStatus = (typeof paymentStatusValues)[number];
export type DeliveryMethod = (typeof deliveryMethodValues)[number];
export type PaymentProvider = (typeof paymentProviderValues)[number];

const sortFields = [
  "createdAt",
  "updatedAt",
  "total",
  "status",
  "email",
] as const;

export const ordersSortSchema = z.enum(sortFields);
export type OrdersSortField = z.infer<typeof ordersSortSchema>;

function emptyToUndefined(value: unknown): unknown {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }
  return value;
}

export const ordersListQuerySchema = z.object({
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
    z.enum(orderStatusValues).optional(),
  ),
  paymentStatus: z.preprocess(
    emptyToUndefined,
    z.enum(paymentStatusValues).optional(),
  ),
  sort: z.preprocess(
    emptyToUndefined,
    ordersSortSchema.default("createdAt"),
  ),
  order: z.preprocess(
    emptyToUndefined,
    z.enum(["asc", "desc"]).default("desc"),
  ),
});

export type OrdersListQuery = z.infer<typeof ordersListQuerySchema>;

const orderItemInputSchema = z.object({
  productId: z.string().cuid("Producto inválido"),
  quantity: z.coerce.number().int().min(1).max(999),
});

export const createOrderSchema = z.object({
  email: z.string().trim().email("Email inválido").max(320),
  customerName: z.preprocess(
    emptyToUndefined,
    z.string().trim().min(1).max(200).optional(),
  ),
  userId: z.preprocess(
    emptyToUndefined,
    z.string().min(1).max(64).optional(),
  ),
  items: z
    .array(orderItemInputSchema)
    .min(1, "Agrega al menos un producto")
    .max(50),
  createPaymentLink: z.boolean().default(true),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const updateOrderStatusSchema = z.object({
  id: z.string().cuid(),
  status: z.enum(orderStatusValues),
});

export const createPaymentLinkSchema = z.object({
  orderId: z.string().cuid(),
});

export const checkoutFromCartSchema = z.object({
  email: z.string().trim().email("Email inválido").max(320).optional(),
  customerName: z.preprocess(
    emptyToUndefined,
    z.string().trim().min(1).max(200).optional(),
  ),
  phone: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(40).optional(),
  ),
  addressLine1: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(200).optional(),
  ),
  addressLine2: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(200).optional(),
  ),
  city: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(120).optional(),
  ),
  region: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(120).optional(),
  ),
  commune: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(120).optional(),
  ),
});

export type CheckoutFromCartInput = z.infer<typeof checkoutFromCartSchema>;

export const updateCartItemSchema = z.object({
  cartItemId: z.string().cuid(),
  quantity: z.coerce.number().int().min(1).max(999),
});

export const removeCartItemSchema = z.object({
  cartItemId: z.string().cuid(),
});

export const addCartItemSchema = z.object({
  productId: z.string().cuid(),
  quantity: z.coerce.number().int().min(1).max(999).default(1),
});

export const orderStatusLabel: Record<OrderStatus, string> = {
  PENDING: "Pendiente",
  PAID: "Pagada",
  PROCESSING: "Procesando",
  FULFILLED: "Completada",
  PARTIALLY_FULFILLED: "Parcial",
  CANCELED: "Cancelada",
  REFUNDED: "Reembolsada",
};

export const paymentStatusLabel: Record<PaymentStatus, string> = {
  PENDING: "Pendiente",
  PAID: "Pagado",
  FAILED: "Fallido",
  REFUNDED: "Reembolsado",
};

export const deliveryMethodLabel: Record<DeliveryMethod, string> = {
  SMM: "SMM",
  KINGUIN: "Kinguin",
  MANUAL: "Manual",
};
