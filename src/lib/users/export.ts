import type { UserListItemDto } from "@/types/users";

function csvCell(value: string | number | boolean | null) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export function buildUsersCsv(rows: UserListItemDto[]): string {
  const header = [
    "ID",
    "Nombre",
    "Email",
    "Rol",
    "Estado",
    "Email verificado",
    "Fecha de registro",
    "Última actividad",
    "Pedidos",
    "Total gastado",
    "Moneda",
  ];

  const lines = rows.map((row) =>
    [
      row.id,
      row.name,
      row.email,
      row.role,
      row.accountStatus,
      row.emailVerified,
      row.createdAt,
      row.lastActivityAt,
      row.orderCount,
      row.totalSpent,
      row.currency,
    ]
      .map(csvCell)
      .join(","),
  );

  return `\uFEFF${header.map(csvCell).join(",")}\n${lines.join("\n")}`;
}
