import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";
import type { z } from "zod";
import type { threadListQuerySchema } from "@/lib/validations/communications";

type ThreadQuery = z.infer<typeof threadListQuerySchema>;

export async function getEmailThreads(query: ThreadQuery, actorUserId?: string) {
  const where: Prisma.CommunicationThreadWhereInput = { deletedAt: null };
  if (query.mailbox === "archived") where.status = "ARCHIVED";
  else if (query.mailbox === "spam") where.status = "SPAM";
  else if (query.mailbox === "sent") where.messages = { some: { direction: "OUTBOUND", status: { not: "DRAFT" }, deletedAt: null } };
  else if (query.mailbox === "drafts") where.messages = { some: { status: "DRAFT", deletedAt: null } };
  else where.status = { in: ["OPEN", "PENDING", "RESOLVED"] };

  if (query.state === "unread") where.unreadCount = { gt: 0 };
  if (query.state === "pending") where.status = "OPEN";
  if (query.state === "answered") where.status = { in: ["PENDING", "RESOLVED"] };
  if (query.state === "mine") where.assignedUserId = actorUserId ?? "__none__";
  if (query.state === "unassigned") where.assignedUserId = null;
  if (query.priority) where.priority = query.priority;
  if (query.userId) where.userId = query.userId;
  if (query.orderId) where.orderId = query.orderId;
  if (query.category) where.category = query.category;
  if (query.from || query.to) where.lastMessageAt = { gte: query.from, lte: query.to };
  if (query.q) {
    where.OR = [
      { subject: { contains: query.q, mode: "insensitive" } },
      { user: { is: { name: { contains: query.q, mode: "insensitive" } } } },
      { user: { is: { email: { contains: query.q, mode: "insensitive" } } } },
      { orderId: { contains: query.q, mode: "insensitive" } },
      { deliveryId: { contains: query.q, mode: "insensitive" } },
      { messages: { some: { textContent: { contains: query.q, mode: "insensitive" } } } },
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.communicationThread.count({ where }),
    prisma.communicationThread.findMany({
      where,
      orderBy: [{ lastMessageAt: "desc" }, { id: "desc" }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: {
        id: true, subject: true, status: true, priority: true, category: true,
        unreadCount: true, lastMessageAt: true, assignedUserId: true, assignedEmail: true,
        orderId: true, deliveryId: true,
        user: { select: { id: true, name: true, email: true } },
        _count: { select: { messages: true } },
        messages: {
          where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 1,
          select: { textContent: true, direction: true, fromAddress: true, fromName: true, createdAt: true, _count: { select: { attachments: true } } },
        },
      },
    }),
  ]);
  return {
    items: rows.map((row) => ({
      ...row,
      lastMessageAt: row.lastMessageAt.toISOString(),
      messageCount: row._count.messages,
      lastMessage: row.messages[0] ? {
        ...row.messages[0], createdAt: row.messages[0].createdAt.toISOString(), hasAttachments: row.messages[0]._count.attachments > 0,
      } : null,
    })),
    total, page: query.page, pageSize: query.pageSize, totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

export async function getEmailThread(threadId: string) {
  const thread = await prisma.communicationThread.findFirst({
    where: { id: threadId, deletedAt: null },
    select: {
      id: true, subject: true, status: true, priority: true, category: true, unreadCount: true,
      assignedUserId: true, assignedEmail: true, orderId: true, deliveryId: true,
      lastMessageAt: true, createdAt: true,
      user: { select: { id: true, name: true, email: true, accountStatus: true } },
      messages: {
        where: { deletedAt: null }, orderBy: { createdAt: "asc" },
        select: {
          id: true, direction: true, kind: true, status: true, fromAddress: true, fromName: true,
          toAddresses: true, ccAddresses: true, bccAddresses: true, subject: true, textContent: true,
          sanitizedHtml: true, remoteImages: true, sentByEmail: true,
          createdAt: true, sentAt: true, deliveredAt: true, failedAt: true,
          attachments: { select: { id: true, fileName: true, mimeType: true, sizeBytes: true, inline: true, scanStatus: true } },
          events: { orderBy: { occurredAt: "asc" }, select: { id: true, type: true, occurredAt: true } },
        },
      },
      notes: { where: { deletedAt: null }, orderBy: { createdAt: "asc" }, select: { id: true, authorEmail: true, content: true, createdAt: true } },
    },
  });
  if (!thread) return null;
  return {
    ...thread,
    lastMessageAt: thread.lastMessageAt.toISOString(), createdAt: thread.createdAt.toISOString(),
    messages: thread.messages.map((message) => ({
      ...message,
      createdAt: message.createdAt.toISOString(), sentAt: message.sentAt?.toISOString() ?? null,
      deliveredAt: message.deliveredAt?.toISOString() ?? null, failedAt: message.failedAt?.toISOString() ?? null,
      attachments: message.attachments.map((attachment) => ({ ...attachment, sizeBytes: Number(attachment.sizeBytes) })),
      events: message.events.map((event) => ({ ...event, occurredAt: event.occurredAt.toISOString() })),
    })),
    notes: thread.notes.map((note) => ({ ...note, createdAt: note.createdAt.toISOString() })),
  };
}

export async function getCommunicationAdmins() {
  return prisma.user.findMany({ where: { role: "ADMIN", accountStatus: "ACTIVE" }, orderBy: { name: "asc" }, select: { id: true, name: true, email: true } });
}
