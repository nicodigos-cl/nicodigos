import type { OrderStatus } from "@/lib/generated/prisma/client";
export { formatMoney, formatSourceMoney } from "@/lib/currency/format";

const orderStatusLabels: Record<OrderStatus, string> = {
  PENDING: "Pendiente",
  PROCESSING: "Procesando",
  COMPLETED: "Completado",
  CANCELED: "Cancelado",
  REFUNDED: "Reembolsado",
};

export function formatDate(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;

  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatOrderStatus(status: OrderStatus): string {
  return orderStatusLabels[status];
}
