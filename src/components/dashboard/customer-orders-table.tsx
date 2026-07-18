"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { HiOutlineEye } from "react-icons/hi";

import { CustomerStatusBadge } from "@/components/dashboard/customer-status-badge";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import type { CustomerOrderSummary } from "@/lib/customer-dashboard/types";
import { formatDateTime } from "@/lib/format-date";
import { formatMoney } from "@/lib/products/format";

const columns: ColumnDef<CustomerOrderSummary>[] = [
  {
    accessorKey: "number",
    header: "Pedido",
    cell: ({ row }) => (
      <div className="min-w-0">
        <Link
          href={`/dashboard/orders/${row.original.id}`}
          className="font-medium hover:underline"
        >
          {row.original.number}
        </Link>
        <p className="truncate text-xs text-muted-foreground">
          {row.original.productNames.slice(0, 2).join(" · ") ||
            `${row.original.itemsCount} producto(s)`}
        </p>
      </div>
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
    id: "payment",
    header: "Pago",
    cell: ({ row }) =>
      row.original.paymentStatusView ? (
        <CustomerStatusBadge
          label={row.original.paymentStatusView.label}
          tone={row.original.paymentStatusView.tone}
        />
      ) : (
        <span className="text-sm text-muted-foreground">—</span>
      ),
  },
  {
    id: "items",
    header: "Productos",
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.itemsCount}</span>
    ),
  },
  {
    id: "total",
    header: "Total",
    cell: ({ row }) => (
      <span className="font-medium tabular-nums">
        {formatMoney(row.original.total, row.original.currency)}
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
        render={<Link href={`/dashboard/orders/${row.original.id}`} />}
        nativeButton={false}
      >
        <HiOutlineEye className="size-4" />
        Ver
      </Button>
    ),
  },
];

export function CustomerOrdersTable({
  data,
}: {
  data: CustomerOrderSummary[];
}) {
  return (
    <DataTable
      columns={columns}
      data={data}
      manual
      hideToolbar
      hidePagination
      emptyMessage="No hay pedidos para mostrar."
    />
  );
}
