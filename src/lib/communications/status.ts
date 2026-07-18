import type { EmailMessageStatus, WebPushStatus } from "@/generated/prisma/client";

export const WEB_PUSH_TRANSITIONS = {
  DRAFT: ["SCHEDULED", "QUEUED", "CANCELLED"],
  SCHEDULED: ["QUEUED", "CANCELLED"],
  QUEUED: ["SENDING", "FAILED", "CANCELLED"],
  SENDING: ["SENT", "PARTIALLY_SENT", "FAILED"],
  SENT: ["ARCHIVED"],
  PARTIALLY_SENT: ["ARCHIVED"],
  FAILED: ["QUEUED", "ARCHIVED"],
  CANCELLED: ["ARCHIVED"],
  ARCHIVED: [],
} as const satisfies Record<WebPushStatus, readonly WebPushStatus[]>;

export function canTransitionWebPush(from: WebPushStatus, to: WebPushStatus): boolean {
  return (WEB_PUSH_TRANSITIONS[from] as readonly WebPushStatus[]).includes(to);
}

const EMAIL_EVENT_RANK: Record<EmailMessageStatus, number> = {
  DRAFT: 0,
  QUEUED: 1,
  ACCEPTED: 2,
  SENT: 3,
  DELAYED: 4,
  DELIVERED: 5,
  BOUNCED: 6,
  COMPLAINED: 7,
  FAILED: 6,
  CANCELLED: 6,
};

export function shouldApplyEmailStatus(current: EmailMessageStatus, next: EmailMessageStatus): boolean {
  if (["BOUNCED", "COMPLAINED"].includes(next)) return true;
  if (["BOUNCED", "COMPLAINED"].includes(current)) return false;
  return EMAIL_EVENT_RANK[next] >= EMAIL_EVENT_RANK[current];
}

export const emailStatusLabels: Record<EmailMessageStatus, string> = {
  DRAFT: "Borrador",
  QUEUED: "En cola",
  ACCEPTED: "Aceptado por Resend",
  SENT: "Enviado",
  DELIVERED: "Entregado",
  DELAYED: "Demorado",
  BOUNCED: "Rebotado",
  COMPLAINED: "Marcado como spam",
  FAILED: "Fallido",
  CANCELLED: "Cancelado",
};

export const webPushStatusLabels: Record<WebPushStatus, string> = {
  DRAFT: "Borrador",
  SCHEDULED: "Programada",
  QUEUED: "En cola",
  SENDING: "Enviando",
  SENT: "Enviada",
  PARTIALLY_SENT: "Envío parcial",
  FAILED: "Fallida",
  CANCELLED: "Cancelada",
  ARCHIVED: "Archivada",
};
