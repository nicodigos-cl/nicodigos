"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";

import { CustomerStatusBadge } from "@/components/dashboard/customer-status-badge";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { formatCustomerDate } from "@/lib/customer-dashboard/format";
import { customerOrderPath } from "@/lib/customer-dashboard/paths";
import type { CustomerTransactionSummary } from "@/lib/customer-dashboard/types";
import { formatMoney } from "@/lib/products/format";

const columns: ColumnDef<CustomerTransactionSummary>[] = [
  {
    accessorKey: "orderNumber",
    header: "Pedido",
    cell: ({ row }) => (
      <div className="min-w-0">
        <Link
          href={customerOrderPath(row.original.orderId)}
          className="font-medium hover:underline"
        >
          Pedido #{row.original.orderNumber}
        </Link>
        <p className="truncate text-xs text-muted-foreground">
          {row.original.methodLabel}
        </p>
      </div>
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
        {formatCustomerDate(row.original.createdAt)}
      </span>
    ),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <Button
        size="sm"
        variant="outline"
        render={<Link href={customerOrderPath(row.original.orderId)} />}
        nativeButton={false}
      >
        Ver pedido
      </Button>
    ),
  },
];

export function TransactionsTable({
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
