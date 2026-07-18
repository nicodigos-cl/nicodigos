import "server-only";

import prisma from "@/lib/prisma";

const limits = {
  EMAIL_REPLY: { count: 30, windowMs: 60 * 60_000 },
  EMAIL_NEW: { count: 20, windowMs: 60 * 60_000 },
  PUSH_SEND: { count: 10, windowMs: 60 * 60_000 },
  AUDIENCE_ESTIMATE: { count: 30, windowMs: 10 * 60_000 },
} as const;

export async function enforceCommunicationRateLimit(actorUserId: string, operation: keyof typeof limits) {
  const limit = limits[operation];
  const count = await prisma.communicationAuditEvent.count({
    where: {
      actorUserId,
      action: operation,
      result: { in: ["SUCCESS", "PARTIAL"] },
      createdAt: { gte: new Date(Date.now() - limit.windowMs) },
    },
  });
  if (count >= limit.count) {
    throw new Error("RATE_LIMITED");
  }
}
