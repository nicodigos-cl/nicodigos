import "server-only";

import prisma from "@/lib/prisma";
import { isResendConfigured } from "@/lib/email/resend-client";
import { isOneSignalConfigured } from "@/lib/onesignal/server-client";

export async function getCommunicationsOverview(days = 30) {
  const since = new Date(Date.now() - days * 86_400_000);
  const overdue = new Date(Date.now() - 24 * 60 * 60_000);
  const [unread, awaitingReply, sentEmails, failedEmails, subscribers, scheduledPush, sentPush, failedPush, overdueThreads, bounces, complaints, webhookFailures, invalidScheduled, missingPreferences] = await Promise.all([
    prisma.communicationThread.count({ where: { unreadCount: { gt: 0 }, status: { in: ["OPEN", "PENDING"] }, deletedAt: null } }),
    prisma.communicationThread.count({ where: { status: "OPEN", lastInboundAt: { not: null }, deletedAt: null } }),
    prisma.communicationMessage.count({ where: { direction: "OUTBOUND", status: { notIn: ["DRAFT", "QUEUED", "FAILED", "CANCELLED"] }, createdAt: { gte: since }, deletedAt: null } }),
    prisma.communicationMessage.count({ where: { direction: "OUTBOUND", status: { in: ["FAILED", "BOUNCED", "COMPLAINED"] }, createdAt: { gte: since }, deletedAt: null } }),
    prisma.webPushSubscription.count({ where: { optedIn: true, permissionStatus: "GRANTED" } }),
    prisma.webPushNotification.count({ where: { status: "SCHEDULED", deletedAt: null } }),
    prisma.webPushNotification.count({ where: { status: { in: ["SENT", "PARTIALLY_SENT"] }, sentAt: { gte: since }, deletedAt: null } }),
    prisma.webPushNotification.count({ where: { status: "FAILED", createdAt: { gte: since }, deletedAt: null } }),
    prisma.communicationThread.count({ where: { status: "OPEN", lastInboundAt: { lte: overdue }, deletedAt: null } }),
    prisma.communicationMessage.count({ where: { status: "BOUNCED", createdAt: { gte: since } } }),
    prisma.communicationMessage.count({ where: { status: "COMPLAINED", createdAt: { gte: since } } }),
    prisma.communicationWebhookEvent.count({ where: { status: "FAILED", receivedAt: { gte: since } } }),
    prisma.webPushNotification.count({ where: { status: "SCHEDULED", OR: [{ scheduledAt: null }, { estimatedRecipients: 0 }] } }),
    prisma.user.count({ where: { communicationPreference: null, accountStatus: "ACTIVE" } }),
  ]);
  return {
    periodDays: days,
    metrics: { unread, awaitingReply, sentEmails, failedEmails, subscribers, scheduledPush, sentPush, failedPush },
    attention: [
      { key: "overdue", label: "Conversaciones sin respuesta por más de 24 horas", count: overdueThreads, href: "/admin/communications/email?state=pending" },
      { key: "bounces", label: "Emails rebotados en el periodo", count: bounces, href: "/admin/communications/email?mailbox=sent" },
      { key: "complaints", label: "Quejas de spam en el periodo", count: complaints, href: "/admin/communications/email?mailbox=sent" },
      { key: "webhooks", label: "Webhooks de correo fallidos", count: webhookFailures, href: "/admin/communications/settings" },
      { key: "push", label: "Notificaciones web fallidas", count: failedPush, href: "/admin/communications/web-push?status=FAILED" },
      { key: "invalid-scheduled", label: "Programaciones con configuración inválida", count: invalidScheduled, href: "/admin/communications/web-push?status=SCHEDULED" },
      { key: "preferences", label: "Usuarios sin preferencias registradas", count: missingPreferences, href: "/admin/communications/audience" },
      { key: "resend", label: "Resend no está configurado", count: isResendConfigured() ? 0 : 1, href: "/admin/communications/settings" },
      { key: "onesignal", label: "OneSignal no está configurado", count: isOneSignalConfigured() ? 0 : 1, href: "/admin/communications/settings" },
    ].filter((item) => item.count > 0),
  };
}
