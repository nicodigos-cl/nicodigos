import "server-only";

import {
  DeliveryEventSource,
  DeliveryMethod,
  DeliveryStatus,
  type Prisma,
} from "@/generated/prisma/client";
import { sendAdminManualReviewEmail } from "@/lib/deliveries/admin-manual-review-email";
import { recalculateOrderStatus } from "@/lib/deliveries/order-status";
import {
  decideDeliveryEnsureAction,
  isPaidForDelivery,
  isRequestableDeliveryStatus,
} from "@/lib/deliveries/policy";
import { createLogger } from "@/lib/logger";
import { MANUAL_REVIEW_CUSTOMER_MESSAGE } from "@/lib/order-live/events";
import { publishOrderLiveStatus } from "@/lib/order-live/publish";

const log = createLogger({ module: "admin-deliveries" });

type Tx = Prisma.TransactionClient;

export type EnsureDeliveriesResult = {
  created: number;
  requested: number;
  /** Deliveries parked for human fulfillment. */
  manualReviewIds: string[];
};

/**
 * Ensures every order item has a Delivery row (idempotent).
 * Called when an order becomes PAID or when admin opens deliveries.
 *
 * Honors StoreSettings via `decideDeliveryEnsureAction`:
 * - `request` → outbox DELIVERY_REQUESTED
 * - `park_manual` → MANUAL_REVIEW (never silent PENDING)
 */
export async function ensureDeliveriesForOrder(
  orderId: string,
  tx?: Tx,
): Promise<EnsureDeliveriesResult> {
  const { getOperationalSettings } = await import("@/lib/settings/runtime");
  const settings = await getOperationalSettings();

  const client = tx;
  if (!client) {
    const prisma = (await import("@/lib/prisma")).default;
    const result = await prisma.$transaction((inner) =>
      ensureDeliveriesForOrder(orderId, inner),
    );
    await afterEnsureSideEffects(orderId, result.manualReviewIds);
    return result;
  }

  const items = await client.orderItem.findMany({
    where: { orderId },
    select: {
      id: true,
      deliveryMethod: true,
      delivery: {
        select: {
          id: true,
          status: true,
          deliveryMethod: true,
        },
      },
    },
  });
  const order = await client.order.findUniqueOrThrow({
    where: { id: orderId },
    select: {
      status: true,
      payments: { where: { status: "PAID" }, take: 1, select: { id: true } },
    },
  });
  const isPaid = isPaidForDelivery({
    orderStatus: order.status,
    hasPaidPayment: order.payments.length > 0,
  });

  let created = 0;
  const deliveryIds: string[] = [];
  const manualReviewIds: string[] = [];

  for (const item of items) {
    const decision = decideDeliveryEnsureAction(
      settings,
      item.deliveryMethod,
      isPaid,
    );

    if (item.delivery) {
      if (
        decision.action === "request" &&
        isRequestableDeliveryStatus(item.delivery.status)
      ) {
        // Clear prior park state when auto-send was re-enabled.
        if (item.delivery.status === DeliveryStatus.MANUAL_REVIEW) {
          await client.delivery.update({
            where: { id: item.delivery.id },
            data: {
              status: DeliveryStatus.PENDING,
              effectiveDeliveryMethod: null,
              customerMessage: null,
              errorMessage: null,
              lastError: null,
              failedAt: null,
            },
          });
        }
        deliveryIds.push(item.delivery.id);
      } else if (
        decision.action === "park_manual" &&
        item.delivery.status === DeliveryStatus.PENDING
      ) {
        await parkDeliveryForManualReview(client, item.delivery.id, orderId, {
          reason: decision.reason,
        });
        manualReviewIds.push(item.delivery.id);
      }
      continue;
    }

    const parkManual = decision.action === "park_manual";
    const autoRequest = decision.action === "request";

    const delivery = await client.delivery.create({
      data: {
        orderItemId: item.id,
        deliveryMethod: item.deliveryMethod,
        status: parkManual
          ? DeliveryStatus.MANUAL_REVIEW
          : DeliveryStatus.PENDING,
        ...(parkManual
          ? {
              effectiveDeliveryMethod: DeliveryMethod.MANUAL,
              customerMessage: MANUAL_REVIEW_CUSTOMER_MESSAGE,
              failedAt: new Date(),
              errorMessage: decision.reason.slice(0, 2_000),
              lastError: decision.reason.slice(0, 2_000),
            }
          : {}),
        events: {
          create: {
            status: parkManual
              ? DeliveryStatus.MANUAL_REVIEW
              : DeliveryStatus.PENDING,
            message: parkManual
              ? `Entrega creada en revisión manual: ${decision.reason}`
              : "Entrega creada",
            source: DeliveryEventSource.SYSTEM,
          },
        },
      },
      select: { id: true },
    });
    await client.delivery.update({
      where: { id: delivery.id },
      data: { idempotencyKey: `delivery:${delivery.id}` },
    });
    if (autoRequest) deliveryIds.push(delivery.id);
    if (parkManual) manualReviewIds.push(delivery.id);
    created += 1;
  }

  if (manualReviewIds.length > 0) {
    await recalculateOrderStatus(client, orderId);
  }

  const requested = await enqueueDeliveryRequests(client, deliveryIds);

  if (created > 0 || requested > 0 || manualReviewIds.length > 0) {
    log.info(
      { orderId, created, requested, manualReviewIds },
      "Deliveries ensured for order",
    );
  }

  return {
    created,
    requested,
    manualReviewIds,
  };
}

/** Idempotent outbox enqueue for one or more deliveries. */
export async function enqueueDeliveryRequests(
  client: Tx,
  deliveryIds: string[],
): Promise<number> {
  if (deliveryIds.length === 0) return 0;
  const result = await client.outboxEvent.createMany({
    data: deliveryIds.map((deliveryId) => ({
      type: "DELIVERY_REQUESTED" as const,
      aggregateId: deliveryId,
      idempotencyKey: `delivery-requested:${deliveryId}`,
      payload: { deliveryId },
    })),
    skipDuplicates: true,
  });
  return result.count;
}

/**
 * Re-queue a single delivery for automatic fulfillment (admin reopen / retry).
 * Creates outbox event; publisher applies retry settings.
 */
export async function requestDeliveryFulfillment(
  deliveryId: string,
): Promise<{ enqueued: boolean }> {
  const prisma = (await import("@/lib/prisma")).default;
  const { getOperationalSettings } = await import("@/lib/settings/runtime");
  const settings = await getOperationalSettings();

  const delivery = await prisma.delivery.findUnique({
    where: { id: deliveryId },
    select: {
      id: true,
      status: true,
      deliveryMethod: true,
      effectiveDeliveryMethod: true,
      orderItem: {
        select: {
          orderId: true,
          order: {
            select: {
              status: true,
              payments: {
                where: { status: "PAID" },
                take: 1,
                select: { id: true },
              },
            },
          },
        },
      },
    },
  });
  if (!delivery) return { enqueued: false };

  const method =
    delivery.effectiveDeliveryMethod ?? delivery.deliveryMethod;
  const isPaid = isPaidForDelivery({
    orderStatus: delivery.orderItem.order.status,
    hasPaidPayment: delivery.orderItem.order.payments.length > 0,
  });
  const decision = decideDeliveryEnsureAction(settings, method, isPaid);
  if (decision.action !== "request") {
    return { enqueued: false };
  }

  const count = await prisma.$transaction(async (tx) => {
    await tx.delivery.update({
      where: { id: deliveryId },
      data: {
        status: DeliveryStatus.PENDING,
        effectiveDeliveryMethod: null,
        customerMessage: null,
        errorMessage: null,
        lastError: null,
        failedAt: null,
      },
    });
    return enqueueDeliveryRequests(tx, [deliveryId]);
  });

  return { enqueued: count > 0 };
}

async function parkDeliveryForManualReview(
  client: Tx,
  deliveryId: string,
  orderId: string,
  input: { reason: string },
) {
  await client.delivery.update({
    where: { id: deliveryId },
    data: {
      status: DeliveryStatus.MANUAL_REVIEW,
      effectiveDeliveryMethod: DeliveryMethod.MANUAL,
      customerMessage: MANUAL_REVIEW_CUSTOMER_MESSAGE,
      failedAt: new Date(),
      errorMessage: input.reason.slice(0, 2_000),
      lastError: input.reason.slice(0, 2_000),
    },
  });
  await client.deliveryEvent.create({
    data: {
      deliveryId,
      status: DeliveryStatus.MANUAL_REVIEW,
      message: `Requiere revisión manual: ${input.reason}`.slice(0, 2_000),
      source: DeliveryEventSource.SYSTEM,
    },
  });
  await recalculateOrderStatus(client, orderId);
}

async function afterEnsureSideEffects(
  orderId: string,
  manualReviewIds: string[],
) {
  if (manualReviewIds.length === 0) return;
  await Promise.allSettled([
    publishOrderLiveStatus(orderId),
    ...manualReviewIds.map((id) => sendAdminManualReviewEmail(id)),
  ]);
}

/**
 * Run side effects after ensureDeliveriesForOrder was called inside an outer transaction.
 */
export async function notifyManualReviewDeliveries(
  orderId: string,
  manualReviewIds: string[],
) {
  await afterEnsureSideEffects(orderId, manualReviewIds);
}
