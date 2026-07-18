"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { HiOutlineEye } from "react-icons/hi";

import { CustomerStatusBadge } from "@/components/dashboard/customer-status-badge";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import type { CustomerDeliverySummary } from "@/lib/customer-dashboard/types";
import { formatDateTime } from "@/lib/format-date";

const columns: ColumnDef<CustomerDeliverySummary>[] = [
  {
    accessorKey: "productName",
    header: "Producto",
    cell: ({ row }) => (
      <div className="min-w-0">
        <Link
          href={`/dashboard/deliveries/${row.original.id}`}
          className="font-medium hover:underline"
        >
          {row.original.productName}
        </Link>
        <p className="text-xs text-muted-foreground">
          {row.original.methodLabel} · {row.original.orderNumber}
        </p>
      </div>
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
        {formatDateTime(row.original.deliveredAt ?? row.original.createdAt)}
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
        render={<Link href={row.original.primaryAction.href} />}
        nativeButton={false}
      >
        <HiOutlineEye className="size-4" />
        {row.original.primaryAction.label}
      </Button>
    ),
  },
];

export function CustomerDeliveriesTable({
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
