import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";
import type {
  SupportLiveMessagePayload,
  SupportLiveThreadPayload,
} from "@/lib/support-live/events";

const threadSelect = {
  id: true,
  subject: true,
  status: true,
  category: true,
  userId: true,
  orderId: true,
  deliveryId: true,
  assignedUserId: true,
  assignedEmail: true,
  unreadCount: true,
  lastMessageAt: true,
  user: { select: { id: true, name: true, email: true } },
  messages: {
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" as const },
    take: 1,
    select: { textContent: true },
  },
} satisfies Prisma.CommunicationThreadSelect;

function mapThread(
  row: Prisma.CommunicationThreadGetPayload<{ select: typeof threadSelect }>,
): SupportLiveThreadPayload {
  return {
    id: row.id,
    subject: row.subject,
    status: row.status,
    category: row.category,
    userId: row.userId,
    orderId: row.orderId,
    deliveryId: row.deliveryId,
    assignedUserId: row.assignedUserId,
    assignedEmail: row.assignedEmail,
    unreadCount: row.unreadCount,
    lastMessageAt: row.lastMessageAt.toISOString(),
    lastMessagePreview: row.messages[0]?.textContent ?? null,
    userName: row.user?.name ?? null,
    userEmail: row.user?.email ?? null,
  };
}

function mapMessage(row: {
  id: string;
  threadId: string | null;
  direction: "INBOUND" | "OUTBOUND" | "INTERNAL";
  textContent: string;
  fromName: string | null;
  fromAddress: string | null;
  sentByUserId: string | null;
  createdAt: Date;
}): SupportLiveMessagePayload {
  return {
    id: row.id,
    threadId: row.threadId ?? "",
    direction: row.direction === "OUTBOUND" ? "OUTBOUND" : "INBOUND",
    textContent: row.textContent,
    fromName: row.fromName,
    fromAddress: row.fromAddress,
    sentByUserId: row.sentByUserId,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getCustomerLiveThreads(userId: string) {
  const rows = await prisma.communicationThread.findMany({
    where: {
      deletedAt: null,
      channel: "LIVE_CHAT",
      userId,
      status: { in: ["OPEN", "PENDING", "RESOLVED"] },
    },
    orderBy: [{ lastMessageAt: "desc" }, { id: "desc" }],
    select: threadSelect,
  });
  return rows.map(mapThread);
}

export async function getAdminLiveThreads(input?: {
  status?: "OPEN" | "PENDING" | "RESOLVED" | "ARCHIVED";
  q?: string;
}) {
  const where: Prisma.CommunicationThreadWhereInput = {
    deletedAt: null,
    channel: "LIVE_CHAT",
  };

  if (input?.status) {
    where.status = input.status;
  } else {
    where.status = { in: ["OPEN", "PENDING", "RESOLVED"] };
  }

  if (input?.q?.trim()) {
    const q = input.q.trim();
    where.OR = [
      { subject: { contains: q, mode: "insensitive" } },
      { user: { is: { name: { contains: q, mode: "insensitive" } } } },
      { user: { is: { email: { contains: q, mode: "insensitive" } } } },
      { orderId: { contains: q, mode: "insensitive" } },
      { deliveryId: { contains: q, mode: "insensitive" } },
    ];
  }

  const rows = await prisma.communicationThread.findMany({
    where,
    orderBy: [{ lastMessageAt: "desc" }, { id: "desc" }],
    take: 100,
    select: threadSelect,
  });
  return rows.map(mapThread);
}

export async function getLiveThreadForCustomer(
  threadId: string,
  userId: string,
) {
  const thread = await prisma.communicationThread.findFirst({
    where: {
      id: threadId,
      deletedAt: null,
      channel: "LIVE_CHAT",
      userId,
    },
    select: {
      id: true,
      subject: true,
      status: true,
      category: true,
      userId: true,
      orderId: true,
      deliveryId: true,
      assignedUserId: true,
      assignedEmail: true,
      unreadCount: true,
      lastMessageAt: true,
      user: { select: { id: true, name: true, email: true } },
      messages: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          threadId: true,
          direction: true,
          textContent: true,
          fromName: true,
          fromAddress: true,
          sentByUserId: true,
          createdAt: true,
        },
      },
    },
  });

  if (!thread) return null;

  const last = thread.messages[thread.messages.length - 1];
  return {
    thread: mapThread({
      ...thread,
      messages: last ? [{ textContent: last.textContent }] : [],
    }),
    messages: thread.messages.map(mapMessage),
  };
}

export async function getLiveThreadForAdmin(threadId: string) {
  const thread = await prisma.communicationThread.findFirst({
    where: {
      id: threadId,
      deletedAt: null,
      channel: "LIVE_CHAT",
    },
    select: {
      id: true,
      subject: true,
      status: true,
      category: true,
      userId: true,
      orderId: true,
      deliveryId: true,
      assignedUserId: true,
      assignedEmail: true,
      unreadCount: true,
      lastMessageAt: true,
      user: { select: { id: true, name: true, email: true } },
      messages: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          threadId: true,
          direction: true,
          textContent: true,
          fromName: true,
          fromAddress: true,
          sentByUserId: true,
          createdAt: true,
        },
      },
    },
  });

  if (!thread) return null;

  const last = thread.messages[thread.messages.length - 1];
  return {
    thread: mapThread({
      ...thread,
      messages: last ? [{ textContent: last.textContent }] : [],
    }),
    messages: thread.messages.map(mapMessage),
  };
}

export async function getLiveThreadSummary(threadId: string) {
  const thread = await prisma.communicationThread.findFirst({
    where: { id: threadId, deletedAt: null, channel: "LIVE_CHAT" },
    select: threadSelect,
  });
  return thread ? mapThread(thread) : null;
}

export { mapMessage, mapThread };
