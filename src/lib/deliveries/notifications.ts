import "server-only";

import {
  DeliveryEventSource,
  DeliveryNotificationStatus,
  DeliveryNotificationType,
  DeliveryStatus,
  type Prisma,
} from "@/generated/prisma/client";

import { DeliveryCompletedEmail } from "@/emails/delivery-completed-email";
import { DeliveryFailedEmail } from "@/emails/delivery-failed-email";
import { DeliveryProcessingEmail } from "@/emails/delivery-processing-email";
import { sendReactEmail } from "@/lib/email/resend";
import { createLogger } from "@/lib/logger";
import prisma from "@/lib/prisma";

const log = createLogger({ module: "admin-deliveries" });

type NotificationKind = "COMPLETED" | "FAILED" | "PROCESSING";

function appBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.BETTER_AUTH_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

function sanitizeError(message: string): string {
  return message
    .replace(/sk_[a-zA-Z0-9]+/g, "[redacted]")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .slice(0, 500);
}

export async function sendDeliveryNotification(input: {
  deliveryId: string;
  type: NotificationKind;
  isResend?: boolean;
  actor?: { userId?: string; email?: string };
}): Promise<{ sent: boolean; skipped: boolean; error?: string }> {
  const delivery = await prisma.delivery.findUnique({
    where: { id: input.deliveryId },
    select: {
      id: true,
      status: true,
      customerMessage: true,
      deliveredAt: true,
      orderItem: {
        select: {
          productName: true,
          quantity: true,
          order: {
            select: {
              id: true,
              email: true,
              customerName: true,
              user: { select: { name: true } },
            },
          },
        },
      },
      keys: { select: { id: true, label: true, contentType: true, isSecret: true } },
      credentials: {
        select: { id: true, label: true, contentType: true, isSecret: true },
      },
    },
  });

  if (!delivery) {
    return { sent: false, skipped: true, error: "Entrega no encontrada" };
  }

  const recipient = delivery.orderItem.order.email;
  const idempotencyKey = input.isResend
    ? `${delivery.id}:${input.type}:resend:${Date.now()}`
    : `${delivery.id}:${input.type}:initial`;

  if (!input.isResend) {
    const existing = await prisma.deliveryNotification.findUnique({
      where: { idempotencyKey },
      select: { id: true, status: true },
    });
    if (existing?.status === DeliveryNotificationStatus.SENT) {
      log.info(
        { deliveryId: delivery.id, type: input.type },
        "Delivery email skipped (already sent)",
      );
      return { sent: false, skipped: true };
    }
  }

  const notification = await prisma.deliveryNotification.upsert({
    where: { idempotencyKey },
    create: {
      deliveryId: delivery.id,
      type: DeliveryNotificationType[input.type],
      status: DeliveryNotificationStatus.PENDING,
      recipient,
      idempotencyKey,
      isResend: Boolean(input.isResend),
    },
    update: {
      status: DeliveryNotificationStatus.PENDING,
      errorMessage: null,
      isResend: Boolean(input.isResend),
    },
    select: { id: true },
  });

  const orderUrl = `${appBaseUrl()}/dashboard/pedidos/${delivery.orderItem.order.id}`;
  const customerName =
    delivery.orderItem.order.customerName ||
    delivery.orderItem.order.user.name ||
    "cliente";

  const contentSummary = [
    ...delivery.keys.map(
      (k) => k.label || (k.isSecret ? "Contenido protegido" : "Ítem entregado"),
    ),
    ...delivery.credentials.map(
      (c) => c.label || (c.isSecret ? "Credencial protegida" : "Credencial"),
    ),
  ];

  try {
    let subject: string;
    let react;

    if (input.type === "COMPLETED") {
      subject = `Tu entrega está lista · Pedido ${delivery.orderItem.order.id.slice(0, 8)}`;
      react = DeliveryCompletedEmail({
        customerName,
        orderId: delivery.orderItem.order.id,
        productName: delivery.orderItem.productName,
        quantity: delivery.orderItem.quantity,
        deliveredAt: delivery.deliveredAt?.toISOString() ?? new Date().toISOString(),
        orderUrl,
        customerMessage: delivery.customerMessage,
        contentLabels: contentSummary,
        hasSecrets: delivery.keys.some((k) => k.isSecret) ||
          delivery.credentials.some((c) => c.isSecret),
      });
    } else if (input.type === "FAILED") {
      subject = `Problema con tu entrega · Pedido ${delivery.orderItem.order.id.slice(0, 8)}`;
      react = DeliveryFailedEmail({
        customerName,
        orderId: delivery.orderItem.order.id,
        productName: delivery.orderItem.productName,
        orderUrl,
      });
    } else {
      subject = `Estamos procesando tu entrega · Pedido ${delivery.orderItem.order.id.slice(0, 8)}`;
      react = DeliveryProcessingEmail({
        customerName,
        orderId: delivery.orderItem.order.id,
        productName: delivery.orderItem.productName,
        orderUrl,
      });
    }

    const result = await sendReactEmail({
      to: recipient,
      subject,
      react,
    });

    await prisma.$transaction(async (tx) => {
      await tx.deliveryNotification.update({
        where: { id: notification.id },
        data: {
          status: DeliveryNotificationStatus.SENT,
          resendId: result?.id ?? null,
          sentAt: new Date(),
          errorMessage: null,
        },
      });
      await tx.deliveryEvent.create({
        data: {
          deliveryId: delivery.id,
          status: delivery.status,
          message: input.isResend
            ? `Email ${input.type.toLowerCase()} reenviado`
            : `Email ${input.type.toLowerCase()} enviado`,
          source: input.actor
            ? DeliveryEventSource.ADMIN
            : DeliveryEventSource.SYSTEM,
          actorUserId: input.actor?.userId,
          actorEmail: input.actor?.email,
        },
      });
    });

    log.info(
      {
        deliveryId: delivery.id,
        type: input.type,
        resendId: result?.id,
        isResend: Boolean(input.isResend),
      },
      "Delivery email sent",
    );

    return { sent: true, skipped: false };
  } catch (error) {
    const message = sanitizeError(
      error instanceof Error ? error.message : "Error al enviar email",
    );

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.deliveryNotification.update({
        where: { id: notification.id },
        data: {
          status: DeliveryNotificationStatus.FAILED,
          errorMessage: message,
        },
      });
      await tx.deliveryEvent.create({
        data: {
          deliveryId: delivery.id,
          status: delivery.status === DeliveryStatus.DELIVERED
            ? DeliveryStatus.DELIVERED
            : delivery.status,
          message: `Falló el envío de email (${input.type.toLowerCase()})`,
          source: DeliveryEventSource.SYSTEM,
        },
      });
    });

    log.error(
      { deliveryId: delivery.id, type: input.type, err: message },
      "Delivery email failed",
    );

    return { sent: false, skipped: false, error: message };
  }
}
