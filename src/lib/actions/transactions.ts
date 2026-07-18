"use server";

import { revalidatePath } from "next/cache";

import { PaymentEventResult, PaymentEventSource, PaymentEventType, PaymentRefundStatus, PaymentStatus } from "@/generated/prisma/client";
import type { ActionResult } from "@/lib/actions/types";
import { requireAdminSession } from "@/lib/auth/session";
import { getAppBaseUrl, getFlowClient } from "@/lib/flow/client";
import { createLogger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { getProviderPaymentSnapshot, sanitizeProviderError } from "@/lib/transactions/provider";
import { appendPaymentEvent, processVerifiedFlowPayment } from "@/lib/transactions/processing";
import { buildTransactionsCsv } from "@/lib/transactions/export";
import { getAdminTransactions } from "@/lib/transactions/queries";
import { addTransactionNoteSchema, exportTransactionsSchema, markTransactionForReviewSchema, reconcileTransactionSchema, refundTransactionSchema, reprocessPaymentConfirmationSchema, resolveTransactionReviewSchema, retryRefundSchema, syncTransactionSchema, type TransactionsListQuery } from "@/lib/validations/transactions";

const log = createLogger({ module: "admin-transactions" });

function parseSubmission(rawInput: unknown): unknown {
  if (!(rawInput instanceof FormData)) return rawInput;
  const payload = rawInput.get("payload");
  if (typeof payload !== "string") return null;
  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

function validationError(error: { flatten(): { fieldErrors: Record<string, string[]> } }): ActionResult<never> {
  return { success: false, message: "Revisa los datos ingresados.", fieldErrors: error.flatten().fieldErrors };
}

function refresh(paymentId: string, orderId?: string) {
  revalidatePath("/admin/transactions");
  revalidatePath(`/admin/transactions/${paymentId}`);
  if (orderId) revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin/deliveries");
}

async function actor() {
  const session = await requireAdminSession();
  return { userId: session.user.id, email: session.user.email };
}

async function sync(rawInput: unknown, eventType: PaymentEventType): Promise<ActionResult<{ paymentId: string; changed: boolean }>> {
  const currentActor = await actor();
  const schema = eventType === PaymentEventType.RECONCILED ? reconcileTransactionSchema : syncTransactionSchema;
  let input: unknown;
  try { input = parseSubmission(rawInput); } catch { return { success: false, message: "Los datos enviados no son válidos." }; }
  const parsed = schema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const payment = await prisma.payment.findUnique({ where: { id: parsed.data.paymentId }, select: { id: true, orderId: true, provider: true, externalId: true, flowOrder: true, commerceOrder: true, status: true } });
  if (!payment) return { success: false, message: "Transacción no encontrada." };
  if (payment.provider !== "FLOW" || !payment.externalId) return { success: false, message: "Esta transacción no tiene una referencia Flow consultable." };
  const startedAt = performance.now();
  try {
    const snapshot = await getProviderPaymentSnapshot(payment);
    const result = await processVerifiedFlowPayment({ token: payment.externalId, snapshot, source: "ADMIN", actor: currentActor });
    await prisma.paymentEvent.create({ data: { paymentId: payment.id, type: eventType, source: PaymentEventSource.ADMIN, statusBefore: payment.status, statusAfter: snapshot.status, message: parsed.data.reason, actorUserId: currentActor.userId, actorEmail: currentActor.email, providerRef: String(snapshot.flowOrder) } });
    log.info({ action: eventType, paymentId: payment.id, orderId: payment.orderId, provider: payment.provider, statusBefore: payment.status, statusAfter: snapshot.status, result: "success", externalLatencyMs: Math.round(performance.now() - startedAt), providerResponseId: snapshot.flowOrder }, "Transaction provider status checked");
    refresh(payment.id, payment.orderId);
    return { success: true, data: { paymentId: result.paymentId, changed: result.changed } };
  } catch (error) {
    const safe = sanitizeProviderError(error);
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({ where: { id: payment.id }, data: { failureCode: safe.code, failureMessage: safe.message, requiresReview: true } });
      await appendPaymentEvent(tx, { paymentId: payment.id, type: PaymentEventType.ERROR, source: PaymentEventSource.ADMIN, result: PaymentEventResult.FAILED, statusBefore: payment.status, message: safe.message, errorCode: safe.code, actor: currentActor });
    });
    log.warn({ action: eventType, paymentId: payment.id, orderId: payment.orderId, provider: payment.provider, result: "failed", externalLatencyMs: Math.round(performance.now() - startedAt), errorCode: safe.code }, "Transaction provider check failed");
    refresh(payment.id, payment.orderId);
    return { success: false, message: safe.message };
  }
}

export async function syncTransactionStatusAction(rawInput: unknown) {
  return sync(rawInput, PaymentEventType.PROVIDER_STATUS_CHECKED);
}

export async function reconcileTransactionAction(rawInput: unknown) {
  return sync(rawInput, PaymentEventType.RECONCILED);
}

export async function reprocessPaymentConfirmationAction(rawInput: unknown): Promise<ActionResult<{ paymentId: string; deliveriesCreated: number }>> {
  const currentActor = await actor();
  const parsed = reprocessPaymentConfirmationSchema.safeParse(parseSubmission(rawInput));
  if (!parsed.success) return validationError(parsed.error);
  const payment = await prisma.payment.findUnique({ where: { id: parsed.data.paymentId }, select: { id: true, orderId: true, provider: true, externalId: true, flowOrder: true, commerceOrder: true, status: true } });
  if (!payment || payment.provider !== "FLOW" || !payment.externalId) return { success: false, message: "No existe una referencia Flow válida para reprocesar." };
  try {
    const snapshot = await getProviderPaymentSnapshot(payment);
    if (snapshot.status !== PaymentStatus.PAID) return { success: false, message: "Flow no confirma esta transacción como pagada; no se ejecutaron efectos internos." };
    const result = await processVerifiedFlowPayment({ token: payment.externalId, snapshot, source: "ADMIN", actor: currentActor });
    await prisma.paymentEvent.create({ data: { paymentId: payment.id, type: PaymentEventType.CONFIRMATION_REPROCESSED, source: PaymentEventSource.ADMIN, statusBefore: payment.status, statusAfter: snapshot.status, message: parsed.data.reason, actorUserId: currentActor.userId, actorEmail: currentActor.email, providerRef: String(snapshot.flowOrder) } });
    refresh(payment.id, payment.orderId);
    return { success: true, data: { paymentId: payment.id, deliveriesCreated: result.deliveriesCreated } };
  } catch (error) { return { success: false, message: sanitizeProviderError(error).message }; }
}

export async function markTransactionForReviewAction(rawInput: unknown): Promise<ActionResult<{ paymentId: string }>> {
  const currentActor = await actor(); const parsed = markTransactionForReviewSchema.safeParse(parseSubmission(rawInput));
  if (!parsed.success) return validationError(parsed.error);
  const payment = await prisma.payment.findUnique({ where: { id: parsed.data.paymentId }, select: { id: true, orderId: true, status: true, provider: true } });
  if (!payment) return { success: false, message: "Transacción no encontrada." };
  await prisma.$transaction(async (tx) => {
    await tx.payment.update({ where: { id: payment.id }, data: { requiresReview: true, reviewPriority: parsed.data.priority, reviewReason: parsed.data.reason, reviewNote: parsed.data.note, reviewActorUserId: currentActor.userId, reviewActorEmail: currentActor.email, reviewCreatedAt: new Date(), reviewResolvedAt: null } });
    await appendPaymentEvent(tx, { paymentId: payment.id, type: PaymentEventType.REVIEW_MARKED, source: PaymentEventSource.ADMIN, statusBefore: payment.status, statusAfter: payment.status, message: `${parsed.data.priority}: ${parsed.data.reason}${parsed.data.note ? ` · ${parsed.data.note}` : ""}`, actor: currentActor });
  });
  log.info({ action: "mark_review", paymentId: payment.id, orderId: payment.orderId, provider: payment.provider, statusBefore: payment.status, statusAfter: payment.status, result: "success" }, "Transaction marked for review");
  refresh(payment.id, payment.orderId); return { success: true, data: { paymentId: payment.id } };
}

export async function resolveTransactionReviewAction(rawInput: unknown): Promise<ActionResult<{ paymentId: string }>> {
  const currentActor = await actor(); const parsed = resolveTransactionReviewSchema.safeParse(parseSubmission(rawInput));
  if (!parsed.success) return validationError(parsed.error);
  const payment = await prisma.payment.findUnique({ where: { id: parsed.data.paymentId }, select: { id: true, orderId: true, status: true, requiresReview: true } });
  if (!payment) return { success: false, message: "Transacción no encontrada." };
  if (!payment.requiresReview) return { success: false, message: "La transacción no tiene una revisión abierta." };
  await prisma.$transaction(async (tx) => { await tx.payment.update({ where: { id: payment.id }, data: { requiresReview: false, reviewResolvedAt: new Date() } }); await appendPaymentEvent(tx, { paymentId: payment.id, type: PaymentEventType.REVIEW_RESOLVED, source: PaymentEventSource.ADMIN, statusBefore: payment.status, statusAfter: payment.status, message: parsed.data.reason, actor: currentActor }); });
  refresh(payment.id, payment.orderId); return { success: true, data: { paymentId: payment.id } };
}

export async function addTransactionNoteAction(rawInput: unknown): Promise<ActionResult<{ paymentId: string }>> {
  const currentActor = await actor(); const parsed = addTransactionNoteSchema.safeParse(parseSubmission(rawInput));
  if (!parsed.success) return validationError(parsed.error);
  const payment = await prisma.payment.findUnique({ where: { id: parsed.data.paymentId }, select: { id: true, orderId: true, status: true } });
  if (!payment) return { success: false, message: "Transacción no encontrada." };
  await prisma.$transaction((tx) => appendPaymentEvent(tx, { paymentId: payment.id, type: PaymentEventType.NOTE_ADDED, source: PaymentEventSource.ADMIN, statusBefore: payment.status, statusAfter: payment.status, message: parsed.data.note, actor: currentActor }));
  refresh(payment.id, payment.orderId); return { success: true, data: { paymentId: payment.id } };
}

function mapRefundStatus(status: "created" | "accepted" | "rejected" | "refunded" | "canceled"): PaymentRefundStatus {
  return status === "created" ? PaymentRefundStatus.CREATED : status === "accepted" ? PaymentRefundStatus.ACCEPTED : status === "rejected" ? PaymentRefundStatus.REJECTED : status === "refunded" ? PaymentRefundStatus.REFUNDED : PaymentRefundStatus.CANCELLED;
}

async function persistRefundProviderStatus(input: { refundId: string; status: PaymentRefundStatus; flowRefundOrder: string; providerToken?: string; actor?: { userId: string; email: string }; eventType: PaymentEventType; message?: string }) {
  return prisma.$transaction(async (tx) => {
    const refund = await tx.paymentRefund.findUnique({ where: { id: input.refundId }, include: { payment: { select: { id: true, orderId: true, status: true, amount: true, refundAmount: true } } } });
    if (!refund) throw new Error("Reembolso no encontrado.");
    const newlyCompleted = input.status === PaymentRefundStatus.REFUNDED && refund.status !== PaymentRefundStatus.REFUNDED;
    const totalRefunded = Number(refund.payment.refundAmount) + (newlyCompleted ? Number(refund.amount) : 0);
    const nextPaymentStatus = newlyCompleted ? (totalRefunded >= Number(refund.payment.amount) ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED) : refund.payment.status;
    await tx.paymentRefund.update({ where: { id: refund.id }, data: { providerToken: input.providerToken, flowRefundOrder: input.flowRefundOrder, status: input.status, providerMessage: null, completedAt: input.status === PaymentRefundStatus.REFUNDED ? (refund.completedAt ?? new Date()) : null } });
    if (newlyCompleted) {
      await tx.payment.update({ where: { id: refund.paymentId }, data: { refundAmount: totalRefunded, status: nextPaymentStatus } });
      if (nextPaymentStatus === PaymentStatus.REFUNDED) await tx.order.update({ where: { id: refund.payment.orderId }, data: { status: "REFUNDED" } });
    }
    const idempotencyKey = `refund-status:${refund.id}:${input.status}`;
    const eventExists = await tx.paymentEvent.findUnique({ where: { idempotencyKey }, select: { id: true } });
    if (!eventExists) await appendPaymentEvent(tx, { paymentId: refund.paymentId, type: newlyCompleted ? PaymentEventType.REFUND_COMPLETED : input.eventType, source: input.actor ? PaymentEventSource.ADMIN : PaymentEventSource.PROVIDER, statusBefore: refund.payment.status, statusAfter: nextPaymentStatus, message: input.message ?? `Flow informó reembolso ${input.status}.`, actor: input.actor, providerRef: input.flowRefundOrder, idempotencyKey });
    return { paymentId: refund.paymentId, orderId: refund.payment.orderId };
  });
}

export async function refundTransactionAction(rawInput: unknown): Promise<ActionResult<{ refundId: string; status: PaymentRefundStatus }>> {
  const currentActor = await actor(); const parsed = refundTransactionSchema.safeParse(parseSubmission(rawInput));
  if (!parsed.success) return validationError(parsed.error);
  let reservation;
  try {
    reservation = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${parsed.data.paymentId}))`;
      const payment = await tx.payment.findUnique({ where: { id: parsed.data.paymentId }, include: { order: { select: { id: true, email: true } }, refunds: { where: { status: { in: ["CREATED", "ACCEPTED", "REFUNDED", "ERROR"] } }, select: { amount: true } } } });
      if (!payment) throw new Error("Transacción no encontrada.");
      const refundableStatuses: PaymentStatus[] = [PaymentStatus.PAID, PaymentStatus.PARTIALLY_REFUNDED];
      if (payment.provider !== "FLOW" || !refundableStatuses.includes(payment.status)) throw new Error("Solo una transacción Flow aprobada admite reembolso.");
      const used = payment.refunds.reduce((sum, refund) => sum + Number(refund.amount), 0);
      if (parsed.data.amount > Number(payment.amount) - used) throw new Error("El monto supera el saldo máximo reembolsable.");
      const refund = await tx.paymentRefund.create({ data: { paymentId: payment.id, amount: parsed.data.amount, currency: payment.currency, reason: parsed.data.reason, refundCommerceOrder: `refund-${crypto.randomUUID()}`, actorUserId: currentActor.userId, actorEmail: currentActor.email } });
      return { payment, refund };
    });
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "No se pudo reservar el reembolso." };
  }
  const { payment, refund } = reservation;
  const startedAt = performance.now();
  try {
    const remote = await getFlowClient().refunds.create({ refundCommerceOrder: refund.refundCommerceOrder, receiverEmail: payment.payerEmail ?? payment.order.email, amount: parsed.data.amount, urlCallBack: `${getAppBaseUrl()}/api/payments/flow/refund`, commerceTrxId: payment.commerceOrder ?? payment.orderId });
    const status = mapRefundStatus(remote.status);
    await persistRefundProviderStatus({ refundId: refund.id, status, flowRefundOrder: remote.flowRefundOrder, providerToken: remote.token, actor: currentActor, eventType: PaymentEventType.REFUND_REQUESTED, message: `Reembolso solicitado por ${parsed.data.amount} ${payment.currency}. Motivo: ${parsed.data.reason}` });
    log.info({ action: "refund", paymentId: payment.id, orderId: payment.orderId, provider: payment.provider, statusBefore: payment.status, statusAfter: payment.status, result: status, externalLatencyMs: Math.round(performance.now() - startedAt), providerResponseId: remote.flowRefundOrder }, "Refund requested");
    refresh(payment.id, payment.orderId); return { success: true, data: { refundId: refund.id, status } };
  } catch (error) {
    const safe = sanitizeProviderError(error);
    await prisma.$transaction(async (tx) => {
      await tx.paymentRefund.update({ where: { id: refund.id }, data: { status: PaymentRefundStatus.ERROR, providerMessage: safe.message } });
      await tx.payment.update({ where: { id: payment.id }, data: { requiresReview: true, reviewPriority: "CRITICAL", reviewReason: "El resultado de la solicitud de reembolso en Flow es incierto." } });
      await appendPaymentEvent(tx, { paymentId: payment.id, type: PaymentEventType.ERROR, source: PaymentEventSource.ADMIN, result: PaymentEventResult.FAILED, statusBefore: payment.status, statusAfter: payment.status, message: safe.message, errorCode: safe.code, actor: currentActor });
    });
    return { success: false, message: safe.message };
  }
}

export async function retryRefundAction(rawInput: unknown): Promise<ActionResult<{ refundId: string; status: PaymentRefundStatus }>> {
  const currentActor = await actor(); const parsed = retryRefundSchema.safeParse(parseSubmission(rawInput)); if (!parsed.success) return validationError(parsed.error);
  const refund = await prisma.paymentRefund.findUnique({ where: { id: parsed.data.refundId }, include: { payment: { select: { id: true, orderId: true, status: true, amount: true, refundAmount: true } } } });
  if (!refund?.providerToken) return { success: false, message: "El reembolso no tiene una referencia consultable; no se creará otra solicitud automáticamente." };
  try {
    const remote = await getFlowClient().refunds.status.byToken(refund.providerToken);
    const status = mapRefundStatus(remote.status);
    await persistRefundProviderStatus({ refundId: refund.id, status, flowRefundOrder: remote.flowRefundOrder, actor: currentActor, eventType: PaymentEventType.REFUND_STATUS_CHECKED });
    refresh(refund.paymentId, refund.payment.orderId); return { success: true, data: { refundId: refund.id, status } };
  } catch (error) { return { success: false, message: sanitizeProviderError(error).message }; }
}

export async function exportTransactionsAction(rawInput: unknown): Promise<ActionResult<{ filename: string; content: string }>> {
  await actor(); const parsed = exportTransactionsSchema.safeParse(parseSubmission(rawInput)); if (!parsed.success) return validationError(parsed.error);
  const { confirmation: _confirmation, page: _page, pageSize: _pageSize, ...filters } = parsed.data; void _confirmation; void _page; void _pageSize;
  const query = { ...filters, page: 1, pageSize: 100 } satisfies TransactionsListQuery; const rows = []; let page = 1; let totalPages = 1;
  do { const result = await getAdminTransactions({ ...query, page }); rows.push(...result.items); totalPages = Math.min(result.totalPages, 100); page += 1; } while (page <= totalPages);
  return { success: true, data: { filename: `transacciones-${new Date().toISOString().slice(0, 10)}.csv`, content: buildTransactionsCsv(rows) } };
}
