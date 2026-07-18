import { UnrecoverableError, Worker } from "bullmq";

import {
  FulfillmentManualReviewError,
  fulfillDelivery,
  reconcileDelivery,
  recordFulfillmentFailure,
} from "@/lib/deliveries/fulfillment";
import { sendDeliveryNotification } from "@/lib/deliveries/notifications";
import { createLogger } from "@/lib/logger";
import {
  DELIVERY_QUEUE_NAME,
  EMAIL_QUEUE_NAME,
  getQueuePrefix,
  getWorkerConnection,
} from "@/lib/queues/config";
import {
  enqueueDeliveryEmail,
  enqueueDeliveryReconcile,
  type DeliveryEmailJob,
  type FulfillDeliveryJob,
} from "@/lib/queues/delivery";

const log = createLogger({ module: "delivery-worker" });
const prefix = getQueuePrefix();

const deliveryWorker = new Worker<FulfillDeliveryJob>(
  DELIVERY_QUEUE_NAME,
  async (job) => {
    try {
      const result = job.name === "delivery.reconcile"
        ? await reconcileDelivery(job.data.deliveryId)
        : await fulfillDelivery(job.data.deliveryId);
      if (result.status === "DELIVERED") {
        await enqueueDeliveryEmail({ deliveryId: result.deliveryId, type: "COMPLETED" });
      } else if (result.status === "PROCESSING") {
        if (job.name !== "delivery.reconcile") {
          await enqueueDeliveryEmail({ deliveryId: result.deliveryId, type: "PROCESSING" });
        }
        const nextAttempt = (job.data.reconcileAttempt ?? 0) + 1;
        const maxReconciliations = Math.max(
          1,
          Number(process.env.DELIVERY_RECONCILE_MAX_ATTEMPTS) || 2_016,
        );
        if (nextAttempt <= maxReconciliations) {
          await enqueueDeliveryReconcile(result.deliveryId, nextAttempt);
        } else {
          const timeoutError = new FulfillmentManualReviewError(
            "La entrega agotó su ventana de conciliación automática.",
          );
          await recordFulfillmentFailure(result.deliveryId, timeoutError, true);
          await enqueueDeliveryEmail({ deliveryId: result.deliveryId, type: "FAILED" });
        }
      }
      return result;
    } catch (error) {
      const manualReview = error instanceof FulfillmentManualReviewError;
      await recordFulfillmentFailure(job.data.deliveryId, error, manualReview);
      if (manualReview) {
        await enqueueDeliveryEmail({ deliveryId: job.data.deliveryId, type: "FAILED" });
        throw new UnrecoverableError(error.message);
      }
      throw error;
    }
  },
  {
    connection: getWorkerConnection(),
    prefix,
    concurrency: Math.max(1, Number(process.env.DELIVERY_WORKER_CONCURRENCY) || 5),
  },
);

const emailWorker = new Worker<DeliveryEmailJob>(
  EMAIL_QUEUE_NAME,
  async (job) => sendDeliveryNotification(job.data),
  {
    connection: getWorkerConnection(),
    prefix,
    concurrency: Math.max(1, Number(process.env.EMAIL_WORKER_CONCURRENCY) || 5),
  },
);

deliveryWorker.on("completed", (job) => {
  log.info({ jobId: job.id, deliveryId: job.data.deliveryId }, "Delivery job completed");
});
deliveryWorker.on("failed", (job, error) => {
  log.error({ jobId: job?.id, deliveryId: job?.data.deliveryId, err: error }, "Delivery job failed");
  if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) {
    void (async () => {
      const exhausted = new FulfillmentManualReviewError(
        `Se agotaron los reintentos automáticos. ${error.message}`,
      );
      await recordFulfillmentFailure(job.data.deliveryId, exhausted, true);
      await enqueueDeliveryEmail({ deliveryId: job.data.deliveryId, type: "FAILED" });
    })().catch((handlerError) => {
      log.error({ jobId: job.id, err: handlerError }, "Failed to persist exhausted delivery job");
    });
  }
});
emailWorker.on("failed", (job, error) => {
  log.error({ jobId: job?.id, deliveryId: job?.data.deliveryId, err: error }, "Delivery email job failed");
});

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  log.info({ signal }, "Stopping delivery workers");
  await Promise.all([deliveryWorker.close(), emailWorker.close()]);
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

log.info(
  { deliveryConcurrency: deliveryWorker.concurrency, emailConcurrency: emailWorker.concurrency },
  "Delivery workers started",
);
