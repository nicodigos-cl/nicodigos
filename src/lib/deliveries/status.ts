import type { DeliveryMethod, DeliveryStatus } from "@/generated/prisma/client";

const TRANSITIONS: Record<DeliveryStatus, readonly DeliveryStatus[]> = {
  PENDING: ["PROCESSING", "DELIVERED", "FAILED", "CANCELED"],
  PROCESSING: ["DELIVERED", "FAILED", "CANCELED", "PENDING"],
  DELIVERED: ["FAILED"],
  FAILED: ["PENDING", "PROCESSING", "DELIVERED", "CANCELED"],
  CANCELED: ["PENDING", "PROCESSING"],
};

export function canTransitionDeliveryStatus(
  currentStatus: DeliveryStatus,
  nextStatus: DeliveryStatus,
): boolean {
  if (currentStatus === nextStatus) return true;
  return TRANSITIONS[currentStatus].includes(nextStatus);
}

export type DeliveryAdminAction =
  | "mark_processing"
  | "complete_manual"
  | "save_draft"
  | "mark_failed"
  | "cancel"
  | "reopen"
  | "resend_email"
  | "smm_send"
  | "smm_sync"
  | "smm_retry"
  | "smm_refill"
  | "smm_complete_manual"
  | "kinguin_fulfill"
  | "kinguin_sync"
  | "kinguin_retry"
  | "kinguin_import_keys"
  | "kinguin_complete_manual";

export function getAllowedDeliveryActions(input: {
  status: DeliveryStatus;
  method: DeliveryMethod;
  hasExternalOrderId: boolean;
  hasKeysOrCredentials: boolean;
}): DeliveryAdminAction[] {
  const { status, method, hasExternalOrderId, hasKeysOrCredentials } = input;
  const actions: DeliveryAdminAction[] = [];

  if (status === "PENDING" || status === "PROCESSING" || status === "FAILED") {
    if (method === "MANUAL") {
      actions.push("save_draft");
      if (canTransitionDeliveryStatus(status, "PROCESSING")) {
        actions.push("mark_processing");
      }
      if (
        canTransitionDeliveryStatus(status, "DELIVERED") &&
        hasKeysOrCredentials
      ) {
        actions.push("complete_manual");
      }
    }

    if (method === "SMM") {
      if (!hasExternalOrderId) actions.push("smm_send");
      if (hasExternalOrderId) {
        actions.push("smm_sync", "smm_retry", "smm_refill");
      }
      if (canTransitionDeliveryStatus(status, "DELIVERED")) {
        actions.push("smm_complete_manual");
      }
      if (canTransitionDeliveryStatus(status, "PROCESSING")) {
        actions.push("mark_processing");
      }
    }

    if (method === "KINGUIN") {
      if (!hasExternalOrderId) {
        actions.push("kinguin_fulfill");
      } else {
        actions.push("kinguin_sync", "kinguin_retry", "kinguin_import_keys");
      }
      if (canTransitionDeliveryStatus(status, "DELIVERED")) {
        actions.push("kinguin_complete_manual");
      }
      if (canTransitionDeliveryStatus(status, "PROCESSING")) {
        actions.push("mark_processing");
      }
    }
  }

  if (status === "DELIVERED") {
    actions.push("resend_email");
  }

  if (
    (status === "PENDING" || status === "PROCESSING" || status === "FAILED") &&
    canTransitionDeliveryStatus(status, "FAILED")
  ) {
    actions.push("mark_failed");
  }

  if (
    (status === "PENDING" || status === "PROCESSING" || status === "FAILED") &&
    canTransitionDeliveryStatus(status, "CANCELED")
  ) {
    actions.push("cancel");
  }

  if (
    (status === "FAILED" || status === "CANCELED") &&
    canTransitionDeliveryStatus(status, "PENDING")
  ) {
    actions.push("reopen");
  }

  // Deduplicate while preserving order
  return [...new Set(actions)];
}

export const deliveryStatusLabel: Record<DeliveryStatus, string> = {
  PENDING: "Pendiente",
  PROCESSING: "Procesando",
  DELIVERED: "Entregada",
  FAILED: "Fallida",
  CANCELED: "Cancelada",
};

export const deliveryContentTypeLabel: Record<string, string> = {
  PRODUCT_KEY: "Product key",
  CODE: "Código",
  PIN: "PIN",
  USERNAME_PASSWORD: "Usuario y contraseña",
  EMAIL_PASSWORD: "Email y contraseña",
  TOKEN: "Token",
  URL: "URL / enlace",
  INSTRUCTIONS: "Instrucciones",
  FREE_TEXT: "Texto libre",
  OTHER: "Otro",
};
