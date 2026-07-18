import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";
import type { z } from "zod";
import type { pushListQuerySchema } from "@/lib/validations/communications";

type PushQuery = z.infer<typeof pushListQuerySchema>;

export async function getWebPushNotifications(query: PushQuery) {
  const where: Prisma.WebPushNotificationWhereInput = { deletedAt: null };
  if (query.status) where.status = query.status;
  if (query.kind) where.kind = query.kind;
  if (query.q) where.OR = [
    { name: { contains: query.q, mode: "insensitive" } },
    { title: { contains: query.q, mode: "insensitive" } },
    { body: { contains: query.q, mode: "insensitive" } },
    { id: { contains: query.q, mode: "insensitive" } },
    { externalId: { contains: query.q, mode: "insensitive" } },
  ];
  const [total, rows] = await Promise.all([
    prisma.webPushNotification.count({ where }),
    prisma.webPushNotification.findMany({
      where, orderBy: { createdAt: "desc" }, skip: (query.page - 1) * query.pageSize, take: query.pageSize,
      select: { id: true, name: true, title: true, body: true, kind: true, status: true, audienceType: true, estimatedRecipients: true, recipients: true, successful: true, delivered: true, clicked: true, failed: true, createdByEmail: true, scheduledAt: true, sentAt: true, createdAt: true, externalId: true },
    }),
  ]);
  return { items: rows.map((row) => ({ ...row, scheduledAt: row.scheduledAt?.toISOString() ?? null, sentAt: row.sentAt?.toISOString() ?? null, createdAt: row.createdAt.toISOString(), externalId: row.externalId ? `…${row.externalId.slice(-8)}` : null })), total, page: query.page, pageSize: query.pageSize, totalPages: Math.max(1, Math.ceil(total / query.pageSize)) };
}

export async function getWebPushNotification(id: string) {
  const row = await prisma.webPushNotification.findFirst({ where: { id, deletedAt: null }, include: { templateVersion: { select: { id: true, version: true, template: { select: { id: true, name: true } } } } } });
  if (!row) return null;
  return { ...row, scheduledAt: row.scheduledAt?.toISOString() ?? null, queuedAt: row.queuedAt?.toISOString() ?? null, sendingAt: row.sendingAt?.toISOString() ?? null, sentAt: row.sentAt?.toISOString() ?? null, cancelledAt: row.cancelledAt?.toISOString() ?? null, archivedAt: row.archivedAt?.toISOString() ?? null, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), lastProviderSyncAt: row.lastProviderSyncAt?.toISOString() ?? null, externalId: row.externalId ? `…${row.externalId.slice(-8)}` : null };
}

export async function getWebPushMetrics(days = 30) {
  const since = new Date(Date.now() - days * 86_400_000);
  const [activeSubscribers, newSubscribers, denied, statuses, totals] = await Promise.all([
    prisma.webPushSubscription.count({ where: { optedIn: true, permissionStatus: "GRANTED" } }),
    prisma.webPushSubscription.count({ where: { subscribedAt: { gte: since } } }),
    prisma.webPushSubscription.count({ where: { permissionStatus: "DENIED" } }),
    prisma.webPushNotification.groupBy({ by: ["status"], where: { deletedAt: null, createdAt: { gte: since } }, _count: true }),
    prisma.webPushNotification.aggregate({ where: { sentAt: { gte: since } }, _sum: { delivered: true, clicked: true, failed: true } }),
  ]);
  const count = Object.fromEntries(statuses.map((status) => [status.status, status._count]));
  return { periodDays: days, activeSubscribers, newSubscribers, denied, sent: (count.SENT ?? 0) + (count.PARTIALLY_SENT ?? 0), scheduled: count.SCHEDULED ?? 0, failedNotifications: count.FAILED ?? 0, delivered: totals._sum.delivered ?? 0, clicked: totals._sum.clicked ?? 0, deliveryFailures: totals._sum.failed ?? 0 };
}
