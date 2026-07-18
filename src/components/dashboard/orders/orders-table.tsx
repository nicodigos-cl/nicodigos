"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";

import { OrderPrimaryActionButton } from "@/components/dashboard/orders/order-primary-action-button";
import { CustomerStatusBadge } from "@/components/dashboard/customer-status-badge";
import { DataTable } from "@/components/data-table";
import type { CustomerOrderSummary } from "@/lib/customer-dashboard/types";
import { formatCustomerDate } from "@/lib/customer-dashboard/format";
import { customerOrderPath } from "@/lib/customer-dashboard/paths";
import { formatMoney } from "@/lib/products/format";

const columns: ColumnDef<CustomerOrderSummary>[] = [
  {
    accessorKey: "number",
    header: "Pedido",
    cell: ({ row }) => (
      <div className="min-w-0">
        <Link
          href={customerOrderPath(row.original.id)}
          className="font-medium hover:underline"
        >
          Pedido #{row.original.number}
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
        {formatCustomerDate(row.original.createdAt)}
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
    id: "delivery",
    header: "Entrega",
    cell: ({ row }) => (
      <CustomerStatusBadge
        label={row.original.deliverySummary.label}
        tone={row.original.deliverySummary.tone}
      />
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
      <OrderPrimaryActionButton
        action={row.original.primaryAction}
        size="sm"
        variant="outline"
      />
    ),
  },
];

export function OrdersTable({ data }: { data: CustomerOrderSummary[] }) {
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
