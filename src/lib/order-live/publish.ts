import "server-only";

import { createLogger } from "@/lib/logger";
import {
  ORDER_EVENTS_CHANNEL,
  type OrderLiveEvent,
} from "@/lib/order-live/events";
import { getOrderLiveSnapshot } from "@/lib/order-live/status";
import { getRedis } from "@/lib/redis";

const log = createLogger({ module: "order-live-publish" });

export async function publishOrderLiveEvent(
  event: OrderLiveEvent,
): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    log.warn({ orderId: event.orderId }, "Redis unavailable; order live event not published");
    return;
  }

  try {
    if (redis.status !== "ready") {
      await redis.connect();
    }
    await redis.publish(ORDER_EVENTS_CHANNEL, JSON.stringify(event));
  } catch (error) {
    log.warn(
      { err: error, orderId: event.orderId, eventType: event.type },
      "Failed to publish order live event",
    );
  }
}

/** Read PostgreSQL then fan-out a sanitized snapshot (never keys/secrets). */
export async function publishOrderLiveStatus(orderId: string): Promise<void> {
  const snapshot = await getOrderLiveSnapshot(orderId);
  if (!snapshot) return;

  await publishOrderLiveEvent({
    type: "order.status",
    orderId: snapshot.orderId,
    userId: snapshot.userId,
    snapshot,
  });
}
