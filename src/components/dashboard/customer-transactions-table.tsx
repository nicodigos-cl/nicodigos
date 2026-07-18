"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { HiOutlineEye } from "react-icons/hi";

import { CustomerStatusBadge } from "@/components/dashboard/customer-status-badge";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import type { CustomerTransactionSummary } from "@/lib/customer-dashboard/types";
import { formatDateTime } from "@/lib/format-date";
import { formatMoney } from "@/lib/products/format";

const columns: ColumnDef<CustomerTransactionSummary>[] = [
  {
    accessorKey: "orderNumber",
    header: "Pedido",
    cell: ({ row }) => (
      <Link
        href={`/dashboard/pedidos/${row.original.orderId}`}
        className="font-medium hover:underline"
      >
        {row.original.orderNumber}
      </Link>
    ),
  },
  {
    id: "status",
    header: "Estado",
    cell: ({ row }) => (
      <CustomerStatusBadge
        label={row.original.statusView.label}
        tone={row.original.statusView.tone}
      />
    ),
  },
  {
    id: "method",
    header: "Método",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.methodLabel}
      </span>
    ),
  },
  {
    id: "amount",
    header: "Monto",
    cell: ({ row }) => (
      <span className="font-medium tabular-nums">
        {formatMoney(row.original.amount, row.original.currency)}
      </span>
    ),
  },
  {
    id: "createdAt",
    header: "Fecha",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {formatDateTime(row.original.createdAt)}
      </span>
    ),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <Button
        size="sm"
        variant="ghost"
        render={<Link href={`/dashboard/pedidos/${row.original.orderId}`} />}
        nativeButton={false}
      >
        <HiOutlineEye className="size-4" />
        Ver pedido
      </Button>
    ),
  },
];

export function CustomerTransactionsTable({
  data,
}: {
  data: CustomerTransactionSummary[];
}) {
  return (
    <DataTable
      columns={columns}
      data={data}
      manual
      hideToolbar
      hidePagination
      emptyMessage="No hay transacciones para mostrar."
    />
  );
}
