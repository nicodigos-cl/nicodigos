import type { DeliveryStatus } from "@/lib/validations/deliveries";
import type { CustomerStatusTone } from "@/lib/customer-dashboard/status-tone";

export type CustomerOrderDeliverySummary = {
  totalItems: number;
  deliveryCount: number;
  deliveredCount: number;
  processingCount: number;
  pendingCount: number;
  failedCount: number;
  canceledCount: number;
  label: string;
  tone: CustomerStatusTone;
  availableDeliveryId: string | null;
  failedDeliveryId: string | null;
};

export type DeliverySummaryInput = {
  id: string;
  status: DeliveryStatus;
};

export function deriveCustomerOrderDeliverySummary(input: {
  totalItems: number;
  deliveries: DeliverySummaryInput[];
}): CustomerOrderDeliverySummary {
  const { totalItems, deliveries } = input;
  const deliveredCount = deliveries.filter((d) => d.status === "DELIVERED").length;
  const processingCount = deliveries.filter((d) => d.status === "PROCESSING").length;
  const pendingCount = deliveries.filter((d) => d.status === "PENDING").length;
  const failedCount = deliveries.filter((d) => d.status === "FAILED").length;
  const canceledCount = deliveries.filter((d) => d.status === "CANCELED").length;

  const availableDeliveryId =
    deliveries.find((d) => d.status === "DELIVERED")?.id ?? null;
  const failedDeliveryId =
    deliveries.find((d) => d.status === "FAILED")?.id ?? null;

  let label = "Sin entrega iniciada";
  let tone: CustomerStatusTone = "neutral";

  if (deliveries.length === 0) {
    label = "Sin entrega iniciada";
    tone = "neutral";
  } else if (failedCount > 0 && deliveredCount === 0) {
    label =
      failedCount === 1
        ? "Problema con una entrega"
        : "Problemas con entregas";
    tone = "danger";
  } else if (failedCount > 0 && deliveredCount > 0) {
    label = "Entrega parcial con revisión";
    tone = "warning";
  } else if (
    deliveredCount > 0 &&
    deliveredCount < Math.max(totalItems, deliveries.length)
  ) {
    label = `${deliveredCount} de ${Math.max(totalItems, deliveries.length)} entregas disponibles`;
    tone = "info";
  } else if (
    deliveredCount > 0 &&
    deliveredCount >= Math.max(totalItems, deliveries.length)
  ) {
    label = "Todas las entregas disponibles";
    tone = "success";
  } else if (processingCount > 0) {
    label = "Preparando entrega";
    tone = "info";
  } else if (pendingCount > 0) {
    label = "Entrega pendiente";
    tone = "warning";
  } else if (canceledCount === deliveries.length) {
    label = "Entregas canceladas";
    tone = "neutral";
  }

  return {
    totalItems,
    deliveryCount: deliveries.length,
    deliveredCount,
    processingCount,
    pendingCount,
    failedCount,
    canceledCount,
    label,
    tone,
    availableDeliveryId,
    failedDeliveryId,
  };
}

export function getCustomerDeliveryErrorMessage(status: DeliveryStatus): string {
  if (status !== "FAILED") return "";
  return "No pudimos completar esta entrega automáticamente. Nuestro equipo está revisándola.";
}
