import "server-only";

import { DeliveryStatus, OutboxEventStatus } from "@/generated/prisma/client";
import { createLogger } from "@/lib/logger";
import { enqueueDelivery } from "@/lib/queues/delivery";
import prisma from "@/lib/prisma";
import { getOperationalSettings } from "@/lib/settings/runtime";

const log = createLogger({ module: "outbox-publisher" });
const STALE_CLAIM_MS = 5 * 60_000;

export async function publishDeliveryOutbox(batchSize = 50): Promise<{
  published: number;
  failed: number;
}> {
  const now = new Date();
  await prisma.outboxEvent.updateMany({
    where: {
      status: OutboxEventStatus.PROCESSING,
      processingAt: { lt: new Date(now.getTime() - STALE_CLAIM_MS) },
    },
    data: { status: OutboxEventStatus.PENDING, processingAt: null },
  });

  const events = await prisma.outboxEvent.findMany({
    where: {
      type: "DELIVERY_REQUESTED",
      status: { in: [OutboxEventStatus.PENDING, OutboxEventStatus.FAILED] },
      availableAt: { lte: now },
    },
    orderBy: { createdAt: "asc" },
    take: Math.max(1, Math.min(batchSize, 200)),
    select: { id: true, aggregateId: true, status: true, attemptCount: true },
  });

  let published = 0;
  let failed = 0;
  const settings = await getOperationalSettings();
  for (const event of events) {
    const claimed = await prisma.outboxEvent.updateMany({
      where: { id: event.id, status: event.status },
      data: {
        status: OutboxEventStatus.PROCESSING,
        processingAt: new Date(),
        attemptCount: { increment: 1 },
      },
    });
    if (claimed.count !== 1) continue;

    try {
      const deliverySnapshot = await prisma.delivery.findUnique({
        where: { id: event.aggregateId },
        select: { deliveryMethod: true },
      });
      if (!deliverySnapshot) {
        await prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: OutboxEventStatus.PUBLISHED,
            publishedAt: new Date(),
            processingAt: null,
            lastError: "Entrega eliminada antes de publicar el evento.",
          },
        });
        published += 1;
        continue;
      }
      const retryMax = deliverySnapshot.deliveryMethod === "SMM"
        ? settings.smmMaxRetries
        : settings.deliveryRetryMax;
      await enqueueDelivery(event.aggregateId, {
        attempts: Math.max(1, retryMax + 1),
        backoffDelay: Math.max(1, settings.deliveryRetryIntervalMinutes) * 60_000,
      });
      await prisma.$transaction(async (tx) => {
        await tx.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: OutboxEventStatus.PUBLISHED,
            publishedAt: new Date(),
            processingAt: null,
            lastError: null,
          },
        });
        const delivery = await tx.delivery.findUnique({
          where: { id: event.aggregateId },
          select: { orderItem: { select: { orderId: true } } },
        });
        await tx.delivery.updateMany({
          where: {
            id: event.aggregateId,
            status: { in: [DeliveryStatus.PENDING, DeliveryStatus.FAILED] },
          },
          data: {
            status: DeliveryStatus.QUEUED,
            queuedAt: new Date(),
            failedAt: null,
            lastError: null,
          },
        });
        if (delivery) {
          await tx.order.updateMany({
            where: { id: delivery.orderItem.orderId, status: "PAID" },
            data: { status: "PROCESSING" },
          });
        }
      });
      published += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al publicar evento";
      const delaySeconds = Math.min(30 * 60, 2 ** Math.min(event.attemptCount, 10) * 15);
      await prisma.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: OutboxEventStatus.FAILED,
          processingAt: null,
          availableAt: new Date(Date.now() + delaySeconds * 1_000),
          lastError: message.slice(0, 2_000),
        },
      });
      failed += 1;
      log.error({ outboxEventId: event.id, deliveryId: event.aggregateId, err: message }, "Outbox publish failed");
    }
  }

  return { published, failed };
}
