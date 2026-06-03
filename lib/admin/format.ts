import type { OrderStatus } from "@/lib/generated/prisma/client";

const orderStatusLabels: Record<OrderStatus, string> = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  COMPLETED: "Completed",
  CANCELED: "Canceled",
  REFUNDED: "Refunded",
};

export function formatMoney(
  value: { toString(): string } | string | number | null | undefined,
  currency = "EUR",
): string {
  if (value == null) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(0);
  }

  const amount = typeof value === "number" ? value : Number(value.toString());

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatDate(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatOrderStatus(status: OrderStatus): string {
  return orderStatusLabels[status];
}
