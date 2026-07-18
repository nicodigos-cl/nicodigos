"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/lib/actions/types";
import { requireSession } from "@/lib/auth/session";
import { recordCommunicationAudit } from "@/lib/communications/audit";
import {
  requireOwnedDelivery,
  requireOwnedOrder,
} from "@/lib/customer-dashboard/ownership";
import { supportEmail } from "@/lib/customer-dashboard/format";
import { createLogger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { publishSupportLiveEvent } from "@/lib/support-live/publish";
import {
  getLiveThreadSummary,
  mapMessage,
} from "@/lib/support-live/queries";
import {
  markLiveThreadReadSchema,
  openLiveThreadSchema,
  sanitizeLiveMessage,
  sendLiveMessageSchema,
  updateLiveThreadStatusSchema,
} from "@/lib/support-live/validations";

const log = createLogger({ module: "support-live-actions" });

function unauthorized<T>(): ActionResult<T> {
  return { success: false, message: "No autorizado." };
}

function validationError<T>(
  error: { flatten: () => { fieldErrors: Record<string, string[] | undefined> } },
): ActionResult<T> {
  return {
    success: false,
    message: "Revisa los campos e intenta de nuevo.",
    fieldErrors: Object.fromEntries(
      Object.entries(error.flatten().fieldErrors).map(([key, value]) => [
        key,
        value ?? [],
      ]),
    ),
  };
}

function parseSubmission(rawInput: unknown): unknown {
  if (rawInput instanceof FormData) {
    return Object.fromEntries(rawInput.entries());
  }
  return rawInput;
}

export async function openLiveThreadAction(
  rawInput: unknown,
): Promise<ActionResult<{ threadId: string }>> {
  const session = await requireSession();
  if (!session?.user) return unauthorized();

  const parsed = openLiveThreadSchema.safeParse(parseSubmission(rawInput));
  if (!parsed.success) return validationError(parsed.error);

  if (parsed.data.orderId) {
    try {
      await requireOwnedOrder(parsed.data.orderId, session.user.id);
    } catch {
      return { success: false, message: "Pedido no válido." };
    }
  }

  if (parsed.data.deliveryId) {
    try {
      await requireOwnedDelivery(parsed.data.deliveryId, session.user.id);
    } catch {
      return { success: false, message: "Entrega no válida." };
    }
  }

  const text = sanitizeLiveMessage(parsed.data.message);
  const now = new Date();

  const thread = await prisma.$transaction(async (tx) => {
    const created = await tx.communicationThread.create({
      data: {
        subject: parsed.data.subject,
        status: "OPEN",
        channel: "LIVE_CHAT",
        category: parsed.data.category,
        userId: session.user.id,
        orderId: parsed.data.orderId,
        deliveryId: parsed.data.deliveryId,
        unreadCount: 1,
        lastMessageAt: now,
        lastInboundAt: now,
        messages: {
          create: {
            channel: "LIVE_CHAT",
            direction: "INBOUND",
            kind: "SUPPORT",
            status: "DELIVERED",
            provider: "LIVE_CHAT",
            fromAddress: session.user.email,
            fromName: session.user.name,
            toAddresses: [supportEmail()],
            subject: parsed.data.subject,
            textContent: text,
            sentByUserId: session.user.id,
            sentByEmail: session.user.email,
            deliveredAt: now,
          },
        },
      },
      include: {
        messages: { orderBy: { createdAt: "asc" }, take: 1 },
        user: { select: { name: true, email: true } },
      },
    });

    await recordCommunicationAudit(
      {
        actor: { userId: session.user.id, email: session.user.email },
        action: "LIVE_THREAD_OPEN",
        channel: "LIVE_CHAT",
        resourceType: "THREAD",
        resourceId: created.id,
        statusAfter: "OPEN",
      },
      tx,
    );

    return created;
  });

  const message = thread.messages[0];
  const summary = await getLiveThreadSummary(thread.id);
  if (message && summary) {
    await publishSupportLiveEvent({
      type: "message.new",
      threadId: thread.id,
      userId: session.user.id,
      message: mapMessage(message),
      thread: summary,
    });
  }

  revalidatePath("/dashboard/support");
  revalidatePath("/admin/communications/live");

  log.info(
    { action: "openLiveThread", userId: session.user.id, threadId: thread.id },
    "Live support thread opened",
  );

  return { success: true, data: { threadId: thread.id } };
}

export async function sendLiveMessageAction(
  rawInput: unknown,
): Promise<ActionResult<{ messageId: string }>> {
  const session = await requireSession();
  if (!session?.user) return unauthorized();

  const parsed = sendLiveMessageSchema.safeParse(parseSubmission(rawInput));
  if (!parsed.success) return validationError(parsed.error);

  const isAdmin = session.user.role === "ADMIN";
  const thread = await prisma.communicationThread.findFirst({
    where: {
      id: parsed.data.threadId,
      deletedAt: null,
      channel: "LIVE_CHAT",
      ...(isAdmin ? {} : { userId: session.user.id }),
    },
    select: {
      id: true,
      subject: true,
      userId: true,
      status: true,
    },
  });

  if (!thread) {
    return { success: false, message: "Conversación no encontrada." };
  }

  if (thread.status === "ARCHIVED" || thread.status === "SPAM") {
    return { success: false, message: "Esta conversación está cerrada." };
  }

  const text = sanitizeLiveMessage(parsed.data.message);
  const now = new Date();
  const direction = isAdmin ? "OUTBOUND" : "INBOUND";

  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.communicationMessage.create({
      data: {
        threadId: thread.id,
        channel: "LIVE_CHAT",
        direction,
        kind: "SUPPORT",
        status: "DELIVERED",
        provider: "LIVE_CHAT",
        fromAddress: session.user.email,
        fromName: session.user.name,
        toAddresses: isAdmin
          ? [thread.userId ? "customer" : supportEmail()]
          : [supportEmail()],
        subject: thread.subject,
        textContent: text,
        sentByUserId: session.user.id,
        sentByEmail: session.user.email,
        deliveredAt: now,
      },
    });

    await tx.communicationThread.update({
      where: { id: thread.id },
      data: {
        lastMessageAt: now,
        ...(direction === "INBOUND"
          ? {
              lastInboundAt: now,
              status: thread.status === "RESOLVED" ? "OPEN" : thread.status,
              unreadCount: { increment: 1 },
            }
          : {
              lastOutboundAt: now,
              status: "PENDING",
              unreadCount: 0,
              ...(isAdmin
                ? {
                    assignedUserId: session.user.id,
                    assignedEmail: session.user.email,
                  }
                : {}),
            }),
      },
    });

    await recordCommunicationAudit(
      {
        actor: { userId: session.user.id, email: session.user.email },
        action: "LIVE_MESSAGE_SEND",
        channel: "LIVE_CHAT",
        resourceType: "MESSAGE",
        resourceId: created.id,
        statusAfter: "DELIVERED",
        safeMetadata: { threadId: thread.id, direction },
      },
      tx,
    );

    return created;
  });

  const summary = await getLiveThreadSummary(thread.id);
  if (summary) {
    await publishSupportLiveEvent({
      type: "message.new",
      threadId: thread.id,
      userId: thread.userId,
      message: mapMessage(message),
      thread: summary,
    });
  }

  revalidatePath("/dashboard/support");
  revalidatePath(`/dashboard/support?threadId=${thread.id}`);
  revalidatePath("/admin/communications/live");
  revalidatePath(`/admin/communications/live/${thread.id}`);

  return { success: true, data: { messageId: message.id } };
}

export async function markLiveThreadReadAction(
  rawInput: unknown,
): Promise<ActionResult<{ ok: true }>> {
  const session = await requireSession();
  if (!session?.user) return unauthorized();

  const parsed = markLiveThreadReadSchema.safeParse(parseSubmission(rawInput));
  if (!parsed.success) return validationError(parsed.error);

  const isAdmin = session.user.role === "ADMIN";
  const thread = await prisma.communicationThread.findFirst({
    where: {
      id: parsed.data.threadId,
      deletedAt: null,
      channel: "LIVE_CHAT",
      ...(isAdmin ? {} : { userId: session.user.id }),
    },
    select: { id: true, userId: true, unreadCount: true },
  });

  if (!thread) {
    return { success: false, message: "Conversación no encontrada." };
  }

  if (isAdmin && thread.unreadCount > 0) {
    const updated = await prisma.communicationThread.update({
      where: { id: thread.id },
      data: { unreadCount: 0 },
    });
    const summary = await getLiveThreadSummary(updated.id);
    if (summary) {
      await publishSupportLiveEvent({
        type: "thread.updated",
        threadId: thread.id,
        userId: thread.userId,
        thread: summary,
      });
    }
  }

  revalidatePath("/dashboard/support");
  revalidatePath("/admin/communications/live");
  return { success: true, data: { ok: true } };
}

export async function updateLiveThreadStatusAction(
  rawInput: unknown,
): Promise<ActionResult<{ ok: true }>> {
  const session = await requireSession();
  if (!session?.user || session.user.role !== "ADMIN") {
    return unauthorized();
  }

  const parsed = updateLiveThreadStatusSchema.safeParse(
    parseSubmission(rawInput),
  );
  if (!parsed.success) return validationError(parsed.error);

  const thread = await prisma.communicationThread.findFirst({
    where: {
      id: parsed.data.threadId,
      deletedAt: null,
      channel: "LIVE_CHAT",
    },
    select: { id: true, userId: true, status: true },
  });

  if (!thread) {
    return { success: false, message: "Conversación no encontrada." };
  }

  const now = new Date();
  await prisma.communicationThread.update({
    where: { id: thread.id },
    data: {
      status: parsed.data.status,
      resolvedAt: parsed.data.status === "RESOLVED" ? now : null,
      archivedAt: parsed.data.status === "ARCHIVED" ? now : null,
      assignedUserId: session.user.id,
      assignedEmail: session.user.email,
    },
  });

  const summary = await getLiveThreadSummary(thread.id);
  if (summary) {
    await publishSupportLiveEvent({
      type: "thread.updated",
      threadId: thread.id,
      userId: thread.userId,
      thread: summary,
    });
  }

  await recordCommunicationAudit({
    actor: { userId: session.user.id, email: session.user.email },
    action: "LIVE_THREAD_STATUS",
    channel: "LIVE_CHAT",
    resourceType: "THREAD",
    resourceId: thread.id,
    statusBefore: thread.status,
    statusAfter: parsed.data.status,
  });

  revalidatePath("/dashboard/support");
  revalidatePath("/admin/communications/live");
  revalidatePath(`/admin/communications/live/${thread.id}`);

  return { success: true, data: { ok: true } };
}
