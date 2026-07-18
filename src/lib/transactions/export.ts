import type { TransactionListItemDto } from "@/types/transactions";

function csvCell(value: string | number | null) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export function buildTransactionsCsv(rows: TransactionListItemDto[]): string {
  const header = ["ID", "Pedido", "Cliente", "Estado", "Proveedor", "Monto", "Moneda", "Método", "Referencia", "Creada", "Actualizada", "Confirmada", "Conciliación"];
  const lines = rows.map((row) => [row.id, row.orderNumber, row.customerEmail, row.status, row.provider, row.amount, row.currency, row.paymentMethod, row.externalReference, row.createdAt, row.updatedAt, row.confirmedAt, row.consistencyIssueCount ? "REVISAR" : "CONSISTENTE"].map(csvCell).join(","));
  return `\uFEFF${header.map(csvCell).join(",")}\n${lines.join("\n")}`;
}
