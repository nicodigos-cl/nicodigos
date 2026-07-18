import "server-only";

import { getRedis } from "@/lib/redis";
import {
  SUPPORT_EVENTS_CHANNEL,
  type SupportLiveEvent,
} from "@/lib/support-live/events";
import { createLogger } from "@/lib/logger";

const log = createLogger({ module: "support-live-publish" });

export async function publishSupportLiveEvent(
  event: SupportLiveEvent,
): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    log.warn("Redis unavailable; live support event not published");
    return;
  }

  try {
    if (redis.status !== "ready") {
      await redis.connect();
    }
    await redis.publish(SUPPORT_EVENTS_CHANNEL, JSON.stringify(event));
  } catch (error) {
    log.warn(
      { err: error, eventType: event.type, threadId: event.threadId },
      "Failed to publish live support event",
    );
  }
}
