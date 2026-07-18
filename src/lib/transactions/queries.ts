import "server-only";

import { PaymentStatus, type Prisma } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";
import { detectTransactionConsistencyIssues } from "@/lib/transactions/consistency";
import type { TransactionsListQuery } from "@/lib/validations/transactions";
import type { TransactionDetailDto, TransactionListItemDto, TransactionMetricsDto } from "@/types/transactions";

const successfulStatuses: PaymentStatus[] = [PaymentStatus.PAID, PaymentStatus.PARTIALLY_REFUNDED, PaymentStatus.REFUNDED];
const failedStatuses: PaymentStatus[] = [PaymentStatus.FAILED, PaymentStatus.REJECTED, PaymentStatus.CANCELLED, PaymentStatus.EXPIRED];
const iso = (date: Date | null) => date?.toISOString() ?? null;
const maskReference = (value: string | null) => value ? value.length <= 10 ? `${value.slice(0, 3)}•••` : `${value.slice(0, 6)}…${value.slice(-4)}` : null;

function dateRange(query: TransactionsListQuery): Prisma.DateTimeFilter | undefined {
  if (!query.from && !query.to) return undefined;
  return { gte: query.from ? new Date(query.from) : undefined, lte: query.to ? new Date(query.to) : undefined };
}

async function duplicatePaymentIds(): Promise<string[]> {
  const [orders, commerceOrders, flowOrders] = await Promise.all([
    prisma.payment.groupBy({ by: ["orderId"], _count: { id: true }, having: { id: { _count: { gt: 1 } } } }),
    prisma.payment.groupBy({ by: ["commerceOrder"], where: { commerceOrder: { not: null } }, _count: { id: true }, having: { id: { _count: { gt: 1 } } } }),
    prisma.payment.groupBy({ by: ["flowOrder"], where: { flowOrder: { not: null } }, _count: { id: true }, having: { id: { _count: { gt: 1 } } } }),
  ]);
  const rows = await prisma.payment.findMany({ where: { OR: [
    { orderId: { in: orders.map((row) => row.orderId) } },
    { commerceOrder: { in: commerceOrders.flatMap((row) => row.commerceOrder ? [row.commerceOrder] : []) } },
    { flowOrder: { in: flowOrders.flatMap((row) => row.flowOrder == null ? [] : [row.flowOrder]) } },
  ] }, select: { id: true } });
  return rows.map((row) => row.id);
}

async function buildWhere(query: TransactionsListQuery, options?: { ignoreStatus?: boolean }): Promise<Prisma.PaymentWhereInput> {
  const and: Prisma.PaymentWhereInput[] = [];
  if (query.q) {
    const numeric = Number.parseInt(query.q, 10);
    and.push({ OR: [
      { id: { contains: query.q, mode: "insensitive" } }, { orderId: { contains: query.q, mode: "insensitive" } },
      { externalId: { contains: query.q, mode: "insensitive" } }, { commerceOrder: { contains: query.q, mode: "insensitive" } },
      ...(Number.isSafeInteger(numeric) ? [{ flowOrder: numeric }] : []),
      { order: { email: { contains: query.q, mode: "insensitive" } } }, { order: { customerName: { contains: query.q, mode: "insensitive" } } },
      { order: { user: { email: { contains: query.q, mode: "insensitive" } } } }, { order: { user: { name: { contains: query.q, mode: "insensitive" } } } },
    ] });
  }
  if (query.status && !options?.ignoreStatus) and.push({ status: query.status });
  if (query.provider) and.push({ provider: query.provider });
  if (query.type === "REFUND") and.push({ refunds: { some: {} } });
  if (query.type === "PAYMENT") and.push({});
  if (query.method) and.push({ paymentMethod: { contains: query.method, mode: "insensitive" } });
  if (query.currency) and.push({ currency: query.currency });
  if (dateRange(query)) and.push({ createdAt: dateRange(query) });
  if (query.minAmount != null || query.maxAmount != null) and.push({ amount: { gte: query.minAmount, lte: query.maxAmount } });
  if (query.hasError) and.push({ OR: [{ failureCode: { not: null } }, { failureMessage: { not: null } }, { events: { some: { result: "FAILED" } } }] });
  if (query.withoutConfirmation) and.push({ confirmedAt: null });
  if (query.webhookReceived) and.push({ events: { some: { type: { in: ["CALLBACK_RECEIVED", "WEBHOOK_RECEIVED"] } } } });
  if (query.needsReconciliation) and.push({ OR: [{ requiresReview: true }, { status: { in: ["PENDING", "PROCESSING"] }, lastProviderCheckAt: { not: null } }] });
  if (query.refunded) and.push({ OR: [{ status: { in: ["PARTIALLY_REFUNDED", "REFUNDED"] } }, { refundAmount: { gt: 0 } }] });
  if (query.requiresReview) and.push({ requiresReview: true });
  if (query.inconsistentPaidOrder) and.push({ OR: [
    { status: { in: successfulStatuses }, order: { status: "PENDING" } },
    { status: { notIn: successfulStatuses }, order: { status: { in: ["PAID", "PROCESSING", "FULFILLED", "PARTIALLY_FULFILLED"] } } },
  ] });
  if (query.approvedWithoutDelivery) and.push({ status: { in: successfulStatuses }, order: { items: { none: { delivery: { isNot: null } } } } });
  if (query.possibleDuplicate) and.push({ id: { in: await duplicatePaymentIds() } });
  return and.length ? { AND: and } : {};
}

const listSelect = {
  id: true, orderId: true, provider: true, status: true, amount: true, currency: true, externalId: true, flowOrder: true, paymentMethod: true, createdAt: true, updatedAt: true, confirmedAt: true, requiresReview: true, failureCode: true, failureMessage: true,
  order: { select: { email: true, customerName: true, total: true, currency: true, status: true, items: { select: { delivery: { select: { id: true } } } }, payments: { where: { status: { in: successfulStatuses } }, select: { id: true } } } },
  refunds: { select: { id: true }, take: 1 },
} satisfies Prisma.PaymentSelect;

export async function getAdminTransactions(query: TransactionsListQuery) {
  const where = await buildWhere(query);
  const [total, rows] = await prisma.$transaction([
    prisma.payment.count({ where }),
    prisma.payment.findMany({ where, select: listSelect, orderBy: { [query.sort]: query.order }, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
  ]);
  const items: TransactionListItemDto[] = rows.map((row) => {
    const issues = detectTransactionConsistencyIssues({ paymentStatus: row.status, paymentAmount: Number(row.amount), paymentCurrency: row.currency, orderStatus: row.order.status, orderTotal: Number(row.order.total), orderCurrency: row.order.currency, deliveriesCount: row.order.items.filter((item) => item.delivery).length, approvedPaymentsCount: row.order.payments.length });
    return { id: row.id, orderId: row.orderId, orderNumber: row.orderId.slice(-10).toUpperCase(), customerName: row.order.customerName, customerEmail: row.order.email, provider: row.provider, status: row.status, type: row.refunds.length ? "REFUND" : "PAYMENT", amount: Number(row.amount), currency: row.currency, paymentMethod: row.paymentMethod, externalReference: maskReference(row.externalId), flowOrder: row.flowOrder, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), confirmedAt: iso(row.confirmedAt), requiresReview: row.requiresReview, hasError: Boolean(row.failureCode || row.failureMessage), consistencyIssueCount: issues.length };
  });
  return { items, total, page: query.page, pageSize: query.pageSize, totalPages: Math.max(1, Math.ceil(total / query.pageSize)) };
}

export async function getTransactionMetrics(query: TransactionsListQuery): Promise<TransactionMetricsDto> {
  const where = await buildWhere(query, { ignoreStatus: true });
  const [total, pending, approved, failed, refunded, review, approvedAmounts, refundedAmounts] = await Promise.all([
    prisma.payment.count({ where }), prisma.payment.count({ where: { AND: [where, { status: { in: ["PENDING", "PROCESSING"] } }] } }),
    prisma.payment.count({ where: { AND: [where, { status: { in: successfulStatuses } }] } }), prisma.payment.count({ where: { AND: [where, { status: { in: failedStatuses } }] } }),
    prisma.payment.count({ where: { AND: [where, { status: { in: ["PARTIALLY_REFUNDED", "REFUNDED"] } }] } }), prisma.payment.count({ where: { AND: [where, { requiresReview: true }] } }),
    prisma.payment.aggregate({ where: { AND: [where, { status: { in: successfulStatuses } }] }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where, _sum: { refundAmount: true } }),
  ]);
  const hasFilters = Object.entries(query).some(([key, value]) => !["page", "pageSize", "sort", "order", "status"].includes(key) && value !== undefined);
  return { total, pending, approved, failed, refunded, approvedAmount: Number(approvedAmounts._sum.amount ?? 0), refundedAmount: Number(refundedAmounts._sum.refundAmount ?? 0), requiresReview: review, currency: query.currency ?? "CLP", scope: hasFilters ? "filtered" : "global" };
}

function safeMetadata(value: Prisma.JsonValue | null): Record<string, string | number | boolean | null> | null {
  if (!value || Array.isArray(value) || typeof value !== "object") return null;
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item === null || ["string", "number", "boolean"].includes(typeof item)).slice(0, 20)) as Record<string, string | number | boolean | null>;
}

export async function getAdminTransactionById(id: string): Promise<TransactionDetailDto | null> {
  const row = await prisma.payment.findUnique({ where: { id }, include: {
    order: { include: { items: { select: { delivery: { select: { status: true } } } }, payments: { select: { id: true, status: true } } } },
    events: { orderBy: { createdAt: "desc" }, take: 100 }, refunds: { orderBy: { requestedAt: "desc" } },
  } });
  if (!row) return null;
  const approvedPaymentsCount = row.order.payments.filter((payment) => successfulStatuses.includes(payment.status)).length;
  const events = row.events;
  const callbackCount = events.filter((event) => event.type === "CALLBACK_RECEIVED" || event.type === "WEBHOOK_RECEIVED").length;
  const processedCount = events.filter((event) => event.type === "ORDER_MARKED_PAID" && event.result === "SUCCESS").length;
  const providerMapped = row.providerStatus === "Pagada" ? PaymentStatus.PAID : row.providerStatus === "Rechazada" ? PaymentStatus.REJECTED : row.providerStatus === "Anulada" ? PaymentStatus.CANCELLED : row.providerStatus === "Pendiente" ? PaymentStatus.PENDING : null;
  const issues = detectTransactionConsistencyIssues({ paymentStatus: row.status, providerStatus: providerMapped, paymentAmount: Number(row.amount), paymentCurrency: row.currency, orderStatus: row.order.status, orderTotal: Number(row.order.total), orderCurrency: row.order.currency, deliveriesCount: row.order.items.filter((item) => item.delivery).length, approvedPaymentsCount, webhookReceived: callbackCount > 0, webhookProcessed: processedCount > 0, processedConfirmations: processedCount });
  return {
    id: row.id, provider: row.provider, status: row.status, amount: Number(row.amount), currency: row.currency, externalReference: maskReference(row.externalId), flowOrder: row.flowOrder, commerceOrder: row.commerceOrder, paymentMethod: row.paymentMethod, payerEmail: row.payerEmail, providerStatus: row.providerStatus, paidAt: iso(row.paidAt), expiresAt: iso(row.expiresAt), confirmedAt: iso(row.confirmedAt), lastProviderCheckAt: iso(row.lastProviderCheckAt), refundAmount: Number(row.refundAmount), failureCode: row.failureCode, failureMessage: row.failureMessage, safeMetadata: safeMetadata(row.safeMetadata), requiresReview: row.requiresReview, reviewPriority: row.reviewPriority, reviewReason: row.reviewReason, reviewNote: row.reviewNote, reviewActorEmail: row.reviewActorEmail, reviewCreatedAt: iso(row.reviewCreatedAt), reviewResolvedAt: iso(row.reviewResolvedAt), createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
    order: { id: row.order.id, status: row.order.status, customerName: row.order.customerName, email: row.order.email, total: Number(row.order.total), currency: row.order.currency, createdAt: row.order.createdAt.toISOString(), itemsCount: row.order.items.length, deliveriesCount: row.order.items.filter((item) => item.delivery).length, deliveryStatuses: row.order.items.flatMap((item) => item.delivery ? [item.delivery.status] : []) },
    approvedPaymentsCount, issues,
    events: events.map((event) => ({ id: event.id, type: event.type, source: event.source, result: event.result, statusBefore: event.statusBefore, statusAfter: event.statusAfter, message: event.message, actorEmail: event.actorEmail, createdAt: event.createdAt.toISOString() })),
    refunds: row.refunds.map((refund) => ({ id: refund.id, amount: Number(refund.amount), currency: refund.currency, reason: refund.reason, status: refund.status, flowRefundOrder: refund.flowRefundOrder, requestedAt: refund.requestedAt.toISOString(), completedAt: iso(refund.completedAt) })),
  };
}

export const getTransactionTimeline = async (paymentId: string) => (await getAdminTransactionById(paymentId))?.events ?? [];
export const getTransactionConsistencyIssues = async (paymentId: string) => (await getAdminTransactionById(paymentId))?.issues ?? [];
export const getOrderTransactionSummary = async (paymentId: string) => (await getAdminTransactionById(paymentId))?.order ?? null;
export async function getPotentialDuplicateTransactions(paymentId: string) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId }, select: { id: true, orderId: true, externalId: true, flowOrder: true, commerceOrder: true, amount: true, payerEmail: true, createdAt: true } });
  if (!payment) return [];
  const start = new Date(payment.createdAt.getTime() - 10 * 60_000); const end = new Date(payment.createdAt.getTime() + 10 * 60_000);
  return prisma.payment.findMany({ where: { id: { not: payment.id }, OR: [{ orderId: payment.orderId }, ...(payment.externalId ? [{ externalId: payment.externalId }] : []), ...(payment.flowOrder ? [{ flowOrder: payment.flowOrder }] : []), ...(payment.commerceOrder ? [{ commerceOrder: payment.commerceOrder }] : []), { amount: payment.amount, payerEmail: payment.payerEmail, createdAt: { gte: start, lte: end } }] }, select: { id: true, status: true, amount: true, currency: true, createdAt: true }, take: 20 });
}
