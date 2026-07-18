import { z } from "zod";

export const paymentStatusValues = ["PENDING", "PROCESSING", "PAID", "FAILED", "REJECTED", "CANCELLED", "EXPIRED", "PARTIALLY_REFUNDED", "REFUNDED"] as const;
export const paymentProviderValues = ["MANUAL", "FLOW", "OTHER"] as const;
export const transactionTypeValues = ["PAYMENT", "REFUND"] as const;
export const reviewPriorityValues = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export const transactionSortValues = ["createdAt", "updatedAt", "amount", "status"] as const;

const emptyToUndefined = (value: unknown) => value === "" || value === null || value === undefined ? undefined : value;
const boolFromSearch = (value: unknown) => {
  if (value === "" || value === null || value === undefined) return undefined;
  if (value === true || value === "true" || value === "1") return true;
  if (value === false || value === "false" || value === "0") return false;
  return value;
};
const optionalDate = z.preprocess(emptyToUndefined, z.string().refine((value) => !Number.isNaN(Date.parse(value)), "Fecha inválida").optional());
const optionalMoney = z.preprocess(emptyToUndefined, z.coerce.number().nonnegative().max(999_999_999).optional());

export const transactionsListQuerySchema = z.object({
  page: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).default(1)),
  pageSize: z.preprocess(emptyToUndefined, z.coerce.number().int().refine((value) => [10, 20, 50, 100].includes(value), "Tamaño inválido").default(20)),
  q: z.preprocess(emptyToUndefined, z.string().trim().max(160).transform((value) => value.replace(/\s+/g, " ")).optional()),
  status: z.preprocess(emptyToUndefined, z.enum(paymentStatusValues).optional()),
  provider: z.preprocess(emptyToUndefined, z.enum(paymentProviderValues).optional()),
  type: z.preprocess(emptyToUndefined, z.enum(transactionTypeValues).optional()),
  method: z.preprocess(emptyToUndefined, z.string().trim().max(80).optional()),
  currency: z.preprocess(emptyToUndefined, z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).optional()),
  from: optionalDate,
  to: optionalDate,
  minAmount: optionalMoney,
  maxAmount: optionalMoney,
  hasError: z.preprocess(boolFromSearch, z.boolean().optional()),
  withoutConfirmation: z.preprocess(boolFromSearch, z.boolean().optional()),
  webhookReceived: z.preprocess(boolFromSearch, z.boolean().optional()),
  needsReconciliation: z.preprocess(boolFromSearch, z.boolean().optional()),
  refunded: z.preprocess(boolFromSearch, z.boolean().optional()),
  possibleDuplicate: z.preprocess(boolFromSearch, z.boolean().optional()),
  inconsistentPaidOrder: z.preprocess(boolFromSearch, z.boolean().optional()),
  approvedWithoutDelivery: z.preprocess(boolFromSearch, z.boolean().optional()),
  requiresReview: z.preprocess(boolFromSearch, z.boolean().optional()),
  sort: z.preprocess(emptyToUndefined, z.enum(transactionSortValues).default("createdAt")),
  order: z.preprocess(emptyToUndefined, z.enum(["asc", "desc"]).default("desc")),
}).superRefine((value, ctx) => {
  if (value.minAmount != null && value.maxAmount != null && value.minAmount > value.maxAmount) ctx.addIssue({ code: "custom", path: ["maxAmount"], message: "El monto máximo debe ser mayor o igual al mínimo" });
  if (value.from && value.to && Date.parse(value.from) > Date.parse(value.to)) ctx.addIssue({ code: "custom", path: ["to"], message: "La fecha final debe ser posterior a la inicial" });
});

export type TransactionsListQuery = z.infer<typeof transactionsListQuerySchema>;

export const transactionIdSchema = z.object({ paymentId: z.string().cuid("Transacción inválida") });
export const syncTransactionSchema = transactionIdSchema.extend({ reason: z.string().trim().min(3).max(500).default("Consulta administrativa") });
export const reconcileTransactionSchema = syncTransactionSchema;
export const reprocessPaymentConfirmationSchema = transactionIdSchema.extend({ reason: z.string().trim().min(10, "Explica por qué necesitas reprocesar").max(1000), confirmation: z.literal("REPROCESAR") });
export const markTransactionForReviewSchema = transactionIdSchema.extend({ reason: z.string().trim().min(5).max(500), priority: z.enum(reviewPriorityValues), note: z.string().trim().max(2000).optional() });
export const resolveTransactionReviewSchema = transactionIdSchema.extend({ reason: z.string().trim().min(5).max(1000) });
export const addTransactionNoteSchema = transactionIdSchema.extend({ note: z.string().trim().min(1).max(2000) });
export const refundTransactionSchema = transactionIdSchema.extend({ amount: z.coerce.number().positive().max(999_999_999), reason: z.string().trim().min(10).max(1000), confirmation: z.literal("REEMBOLSAR") });
export const retryRefundSchema = z.object({ refundId: z.string().cuid("Reembolso inválido") });
export const exportTransactionsSchema = transactionsListQuerySchema.safeExtend({ confirmation: z.literal("EXPORTAR") });

export const paymentStatusLabel: Record<(typeof paymentStatusValues)[number], string> = {
  PENDING: "Pendiente", PROCESSING: "Procesando", PAID: "Aprobada", FAILED: "Fallida", REJECTED: "Rechazada", CANCELLED: "Cancelada", EXPIRED: "Expirada", PARTIALLY_REFUNDED: "Reembolso parcial", REFUNDED: "Reembolsada",
};
export const paymentProviderLabel: Record<(typeof paymentProviderValues)[number], string> = { MANUAL: "Manual", FLOW: "Flow.cl", OTHER: "Otro" };
export const reviewPriorityLabel: Record<(typeof reviewPriorityValues)[number], string> = { LOW: "Baja", MEDIUM: "Media", HIGH: "Alta", CRITICAL: "Crítica" };
