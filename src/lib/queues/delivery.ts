import "server-only";

import { Queue } from "bullmq";

import {
  DELIVERY_QUEUE_NAME,
  EMAIL_QUEUE_NAME,
  getProducerConnection,
  getQueuePrefix,
} from "@/lib/queues/config";

export type FulfillDeliveryJob = { deliveryId: string; reconcileAttempt?: number };
export type DeliveryEmailJob = {
  deliveryId: string;
  type: "COMPLETED" | "FAILED" | "PROCESSING";
};

declare global {
  var deliveryQueueGlobal: Queue<FulfillDeliveryJob> | undefined;
  var deliveryEmailQueueGlobal: Queue<DeliveryEmailJob> | undefined;
}

export function getDeliveryQueue(): Queue<FulfillDeliveryJob> {
  globalThis.deliveryQueueGlobal ??= new Queue<FulfillDeliveryJob>(
    DELIVERY_QUEUE_NAME,
    {
      connection: getProducerConnection(),
      prefix: getQueuePrefix(),
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: "exponential", delay: 5_000 },
        removeOnComplete: { age: 30 * 24 * 60 * 60, count: 10_000 },
        removeOnFail: { age: 30 * 24 * 60 * 60, count: 10_000 },
      },
    },
  );
  return globalThis.deliveryQueueGlobal;
}

export function getDeliveryEmailQueue(): Queue<DeliveryEmailJob> {
  globalThis.deliveryEmailQueueGlobal ??= new Queue<DeliveryEmailJob>(
    EMAIL_QUEUE_NAME,
    {
      connection: getProducerConnection(),
      prefix: getQueuePrefix(),
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: "exponential", delay: 10_000 },
        removeOnComplete: { age: 30 * 24 * 60 * 60, count: 10_000 },
        removeOnFail: { age: 30 * 24 * 60 * 60, count: 10_000 },
      },
    },
  );
  return globalThis.deliveryEmailQueueGlobal;
}

export async function enqueueDelivery(
  deliveryId: string,
  options?: { attempts?: number; backoffDelay?: number },
) {
  return getDeliveryQueue().add(
    "delivery.fulfill",
    { deliveryId },
    {
      jobId: `delivery-${deliveryId}`,
      attempts: options?.attempts,
      backoff: options?.backoffDelay
        ? { type: "exponential", delay: options.backoffDelay }
        : undefined,
    },
  );
}

export async function enqueueDeliveryEmail(job: DeliveryEmailJob) {
  return getDeliveryEmailQueue().add("delivery.send-email", job, {
    jobId: `delivery-email-${job.deliveryId}-${job.type.toLowerCase()}`,
  });
}

export async function enqueueDeliveryReconcile(
  deliveryId: string,
  reconcileAttempt: number,
) {
  const delay = Math.max(
    10_000,
    Number(process.env.DELIVERY_RECONCILE_DELAY_MS) || 5 * 60_000,
  );
  return getDeliveryQueue().add(
    "delivery.reconcile",
    { deliveryId, reconcileAttempt },
    {
      jobId: `delivery-reconcile-${deliveryId}-${reconcileAttempt}`,
      delay,
    },
  );
}
