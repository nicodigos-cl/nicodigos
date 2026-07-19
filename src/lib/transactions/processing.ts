import "server-only";

import {
  OrderStatus,
  PaymentEventResult,
  PaymentEventSource,
  PaymentEventType,
  PaymentStatus,
  type Prisma,
} from "@/generated/prisma/client";
import { ensureDeliveriesForOrder } from "@/lib/deliveries/ensure";
import { publishOrderLiveStatus } from "@/lib/order-live/publish";
import prisma from "@/lib/prisma";
import type { ProviderPaymentSnapshot } from "@/lib/transactions/provider";
import {
  canTransitionPaymentStatus,
  normalizeFlowAmount,
} from "@/lib/transactions/status";

type Actor = { userId?: string | null; email?: string | null };

export async function appendPaymentEvent(
  tx: Prisma.TransactionClient,
  input: {
    paymentId: string;
    type: PaymentEventType;
    source?: PaymentEventSource;
    result?: PaymentEventResult;
    statusBefore?: PaymentStatus | null;
    statusAfter?: PaymentStatus | null;
    message?: string | null;
    actor?: Actor;
    providerRef?: string | null;
    errorCode?: string | null;
    idempotencyKey?: string | null;
  },
) {
  return tx.paymentEvent.create({
    data: {
      paymentId: input.paymentId,
      type: input.type,
      source: input.source ?? PaymentEventSource.SYSTEM,
      result: input.result ?? PaymentEventResult.SUCCESS,
      statusBefore: input.statusBefore,
      statusAfter: input.statusAfter,
      message: input.message?.slice(0, 2000),
      actorUserId: input.actor?.userId,
      actorEmail: input.actor?.email,
      providerRef: input.providerRef?.slice(0, 120),
      errorCode: input.errorCode?.slice(0, 120),
      idempotencyKey: input.idempotencyKey,
    },
  });
}

export async function processVerifiedFlowPayment(input: {
  token: string;
  snapshot: ProviderPaymentSnapshot;
  source: "CALLBACK" | "ADMIN";
  actor?: Actor;
}): Promise<{
  paymentId: string;
  changed: boolean;
  deliveriesCreated: number;
  orderId: string;
}> {
  const providerAmount = normalizeFlowAmount(input.snapshot.amount);

  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.snapshot.commerceOrder}))`;
    const payment = await tx.payment.findFirst({
      where: {
        provider: "FLOW",
        OR: [
          { externalId: input.token },
          { commerceOrder: input.snapshot.commerceOrder },
          { orderId: input.snapshot.commerceOrder },
        ],
      },
      orderBy: { createdAt: "desc" },
      include: {
        order: {
          select: { id: true, total: true, currency: true, status: true },
        },
      },
    });
    if (!payment) {
      throw new Error("No existe una transacción local para esta confirmación.");
    }

    const source =
      input.source === "CALLBACK"
        ? PaymentEventSource.CALLBACK
        : PaymentEventSource.ADMIN;
    const callbackKey =
      input.source === "CALLBACK"
        ? `flow-callback:${input.token}:${input.snapshot.status}`
        : undefined;

    if (callbackKey) {
      const existing = await tx.paymentEvent.findUnique({
        where: { idempotencyKey: callbackKey },
        select: { id: true },
      });
      if (existing) {
        return {
          paymentId: payment.id,
          changed: false,
          deliveriesCreated: 0,
          orderId: payment.orderId,
          manualReviewIds: [] as string[],
        };
      }
    }

    await appendPaymentEvent(tx, {
      paymentId: payment.id,
      type:
        input.source === "CALLBACK"
          ? PaymentEventType.CALLBACK_RECEIVED
          : PaymentEventType.PROVIDER_STATUS_CHECKED,
      source,
      statusBefore: payment.status,
      statusAfter: input.snapshot.status,
      message: `Flow informó estado ${input.snapshot.providerStatus}.`,
      actor: input.actor,
      providerRef: String(input.snapshot.flowOrder),
      idempotencyKey: callbackKey,
    });

    if (
      input.snapshot.commerceOrder !== payment.orderId ||
      providerAmount !== Number(payment.order.total) ||
      input.snapshot.currency !== payment.order.currency
    ) {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          requiresReview: true,
          reviewPriority: "CRITICAL",
          reviewReason: "La respuesta de Flow no coincide con el pedido local.",
          lastProviderCheckAt: new Date(),
          providerStatus: input.snapshot.providerStatus,
        },
      });
      await appendPaymentEvent(tx, {
        paymentId: payment.id,
        type: PaymentEventType.ERROR,
        source,
        result: PaymentEventResult.FAILED,
        message:
          "Se rechazó la actualización por diferencia de referencia, monto o moneda.",
        actor: input.actor,
        errorCode: "PROVIDER_DATA_MISMATCH",
      });
      return {
        paymentId: payment.id,
        changed: false,
        deliveriesCreated: 0,
        orderId: payment.orderId,
        manualReviewIds: [] as string[],
      };
    }

    const providerAuthoritative =
      input.source === "CALLBACK" || input.source === "ADMIN";
    const refundedStatuses: PaymentStatus[] = [
      PaymentStatus.REFUNDED,
      PaymentStatus.PARTIALLY_REFUNDED,
    ];
    if (
      !canTransitionPaymentStatus(payment.status, input.snapshot.status) &&
      !(
        providerAuthoritative &&
        input.snapshot.status === PaymentStatus.PAID &&
        !refundedStatuses.includes(payment.status)
      )
    ) {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          requiresReview: true,
          reviewPriority: "HIGH",
          reviewReason: `Transición no permitida: ${payment.status} → ${input.snapshot.status}`,
          providerStatus: input.snapshot.providerStatus,
          lastProviderCheckAt: new Date(),
        },
      });
      return {
        paymentId: payment.id,
        changed: false,
        deliveriesCreated: 0,
        orderId: payment.orderId,
        manualReviewIds: [] as string[],
      };
    }

    const changed = payment.status !== input.snapshot.status;
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: input.snapshot.status,
        externalId: input.token,
        flowOrder: input.snapshot.flowOrder,
        commerceOrder: input.snapshot.commerceOrder,
        providerStatus: input.snapshot.providerStatus,
        paymentMethod: input.snapshot.paymentMethod,
        payerEmail: input.snapshot.payerEmail,
        paidAt: input.snapshot.paidAt,
        confirmedAt:
          input.snapshot.status === PaymentStatus.PAID
            ? new Date()
            : payment.confirmedAt,
        lastProviderCheckAt: new Date(),
        failureCode: null,
        failureMessage: null,
      },
    });

    if (changed) {
      await appendPaymentEvent(tx, {
        paymentId: payment.id,
        type: PaymentEventType.STATUS_CHANGED,
        source,
        statusBefore: payment.status,
        statusAfter: input.snapshot.status,
        message: `Estado conciliado con Flow: ${input.snapshot.providerStatus}.`,
        actor: input.actor,
        providerRef: String(input.snapshot.flowOrder),
      });
    }

    let deliveriesCreated = 0;
    let manualReviewIds: string[] = [];
    if (input.snapshot.status === PaymentStatus.PAID) {
      if (payment.order.status === OrderStatus.PENDING) {
        await tx.order.update({
          where: { id: payment.orderId },
          data: { status: OrderStatus.PAID },
        });
        await appendPaymentEvent(tx, {
          paymentId: payment.id,
          type: PaymentEventType.ORDER_MARKED_PAID,
          source,
          statusBefore: payment.status,
          statusAfter: PaymentStatus.PAID,
          message: "Pedido marcado como pagado tras confirmación verificada.",
          actor: input.actor,
          idempotencyKey: `order-paid:${payment.id}`,
        });
      }
      const deliveries = await ensureDeliveriesForOrder(payment.orderId, tx);
      deliveriesCreated = deliveries.created;
      manualReviewIds = deliveries.manualReviewIds;
      if (deliveries.requested > 0) {
        await appendPaymentEvent(tx, {
          paymentId: payment.id,
          type: PaymentEventType.FULFILLMENT_STARTED,
          source,
          message: `Se solicitaron ${deliveries.requested} entrega(s) asíncronas de forma idempotente.`,
          actor: input.actor,
          idempotencyKey: `fulfillment-started:${payment.id}`,
        });
      }
    }

    return {
      paymentId: payment.id,
      changed,
      deliveriesCreated,
      orderId: payment.orderId,
      manualReviewIds,
    };
  });

  if (result.changed) {
    await publishOrderLiveStatus(result.orderId);
  }
  if (result.manualReviewIds.length > 0) {
    const { notifyManualReviewDeliveries } =
      await import("@/lib/deliveries/ensure");
    await notifyManualReviewDeliveries(
      result.orderId,
      result.manualReviewIds,
    );
  }
  return result;
}
