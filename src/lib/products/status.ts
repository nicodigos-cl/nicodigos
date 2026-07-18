import type { ProductStatus } from "@/generated/prisma/client";

export type VisualProductStatus =
  | "ACTIVE"
  | "DRAFT"
  | "ARCHIVED"
  | "OUT_OF_STOCK";

export function getVisualProductStatus(
  status: ProductStatus,
  availableStock: number,
): VisualProductStatus {
  if (status === "ARCHIVED") {
    return "ARCHIVED";
  }

  if (status === "DRAFT") {
    return "DRAFT";
  }

  if (availableStock <= 0) {
    return "OUT_OF_STOCK";
  }

  return "ACTIVE";
}

export function visualProductStatusLabel(
  status: VisualProductStatus,
): string {
  switch (status) {
    case "ACTIVE":
      return "Activo";
    case "DRAFT":
      return "Borrador";
    case "ARCHIVED":
      return "Archivado";
    case "OUT_OF_STOCK":
      return "Sin stock";
  }
}

export function productKeyStatusLabel(
  status: "AVAILABLE" | "RESERVED" | "SOLD" | "REVOKED",
): string {
  switch (status) {
    case "AVAILABLE":
      return "Disponible";
    case "RESERVED":
      return "Reservada";
    case "SOLD":
      return "Vendida";
    case "REVOKED":
      return "Revocada";
  }
}

export function deliveryMethodLabel(
  method: "SMM" | "KINGUIN" | "MANUAL",
): string {
  switch (method) {
    case "SMM":
      return "SMM";
    case "KINGUIN":
      return "Kinguin";
    case "MANUAL":
      return "Manual";
  }
}
