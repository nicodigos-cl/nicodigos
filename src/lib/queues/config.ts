import "server-only";

import type { ConnectionOptions } from "bullmq";

export const DELIVERY_QUEUE_NAME = "delivery";
export const EMAIL_QUEUE_NAME = "email";

export function getQueuePrefix(): string {
  return process.env.BULLMQ_PREFIX?.trim() || "nicodigos";
}

export function getProducerConnection(): ConnectionOptions {
  return {
    url: process.env.REDIS_URL?.trim() || "redis://127.0.0.1:6379",
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
  };
}

export function getWorkerConnection(): ConnectionOptions {
  return {
    url: process.env.REDIS_URL?.trim() || "redis://127.0.0.1:6379",
    maxRetriesPerRequest: null,
  };
}
