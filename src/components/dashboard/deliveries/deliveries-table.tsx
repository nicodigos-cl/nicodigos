"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";

import { CustomerStatusBadge } from "@/components/dashboard/customer-status-badge";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import type { CustomerDeliverySummary } from "@/lib/customer-dashboard/types";
import { formatCustomerDate } from "@/lib/customer-dashboard/format";
import {
  customerDeliveryPath,
  customerOrderPath,
} from "@/lib/customer-dashboard/paths";

const columns: ColumnDef<CustomerDeliverySummary>[] = [
  {
    accessorKey: "productName",
    header: "Producto",
    cell: ({ row }) => (
      <div className="min-w-0">
        <Link
          href={customerDeliveryPath(row.original.id)}
          className="font-medium hover:underline"
        >
          {row.original.productName}
        </Link>
        <p className="truncate text-xs text-muted-foreground">
          {row.original.methodLabel}
          {row.original.hasSecretsAvailable ? " · Contenido listo" : ""}
        </p>
      </div>
    ),
  },
  {
    id: "order",
    header: "Pedido",
    cell: ({ row }) => (
      <Link
        href={customerOrderPath(row.original.orderId)}
        className="text-sm font-medium hover:underline"
      >
        #{row.original.orderNumber}
      </Link>
    ),
  },
  {
    id: "status",
    header: "Estado",
    cell: ({ row }) => (
      <CustomerStatusBadge
        label={
          row.original.smm?.statusView.label ?? row.original.statusView.label
        }
        tone={
          row.original.smm?.statusView.tone ?? row.original.statusView.tone
        }
      />
    ),
  },
  {
    id: "date",
    header: "Fecha",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {formatCustomerDate(
          row.original.deliveredAt ?? row.original.createdAt,
        )}
      </span>
    ),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          size="sm"
          variant="outline"
          render={<Link href={row.original.primaryAction.href} />}
          nativeButton={false}
        >
          {row.original.primaryAction.label}
        </Button>
      </div>
    ),
  },
];

export function DeliveriesTable({
  data,
}: {
  data: CustomerDeliverySummary[];
}) {
  return (
    <DataTable
      columns={columns}
      data={data}
      manual
      hideToolbar
      hidePagination
      emptyMessage="No hay entregas para mostrar."
    />
  );
}
