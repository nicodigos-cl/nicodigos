"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import {
  HiOutlineClipboardCopy,
  HiOutlineDotsHorizontal,
  HiOutlineEye,
  HiOutlineUser,
} from "react-icons/hi";
import { toast } from "sonner";

import { DeliveryStatusBadge } from "@/components/admin/deliveries/delivery-status-badge";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDateTime } from "@/lib/format-date";
import { deliveryMethodLabel } from "@/lib/validations/deliveries";
import type { DeliveryListItemDto } from "@/types/deliveries";

function DeliveryActions({ delivery }: { delivery: DeliveryListItemDto }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label="Acciones" />}
      >
        <HiOutlineDotsHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          render={<Link href={`/admin/deliveries/${delivery.id}`} />}
        >
          <HiOutlineEye className="size-4" />
          Ver detalle
        </DropdownMenuItem>
        <DropdownMenuItem
          render={<Link href={`/admin/orders/${delivery.orderId}`} />}
        >
          Ver pedido
        </DropdownMenuItem>
        <DropdownMenuItem
          render={<Link href={`/admin/users/${delivery.userId}`} />}
        >
          <HiOutlineUser className="size-4" />
          Ver cliente
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            void navigator.clipboard.writeText(delivery.id);
            toast.success("ID copiado");
          }}
        >
          <HiOutlineClipboardCopy className="size-4" />
          Copiar ID
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const deliveriesColumns: ColumnDef<DeliveryListItemDto>[] = [
  {
    accessorKey: "id",
    header: "Entrega",
    cell: ({ row }) => {
      const delivery = row.original;
      return (
        <div className="min-w-0 max-w-48">
          <Link
            href={`/admin/deliveries/${delivery.id}`}
            className="block truncate font-medium hover:underline"
          >
            {delivery.productName}
          </Link>
          <p className="truncate font-mono text-xs text-muted-foreground">
            {delivery.id.slice(0, 12)}…
          </p>
        </div>
      );
    },
  },
  {
    id: "order",
    header: "Pedido",
    cell: ({ row }) => (
      <Link
        href={`/admin/orders/${row.original.orderId}`}
        className="font-mono text-xs hover:underline"
      >
        {row.original.orderId.slice(0, 10)}…
      </Link>
    ),
  },
  {
    id: "customer",
    header: "Cliente",
    cell: ({ row }) => (
      <div className="min-w-0 max-w-40">
        <Link
          href={`/admin/users/${row.original.userId}`}
          className="block truncate text-sm font-medium hover:underline text-primary"
        >
          {row.original.customerName || row.original.userName}
        </Link>
        <p className="truncate text-xs text-muted-foreground">
          {row.original.orderEmail}
        </p>
      </div>
    ),
  },
  {
    id: "method",
    header: "Método",
    cell: ({ row }) => (
      <Badge variant="secondary">
        {deliveryMethodLabel[row.original.deliveryMethod]}
      </Badge>
    ),
  },
  {
    id: "status",
    header: "Estado",
    cell: ({ row }) => <DeliveryStatusBadge status={row.original.status} />,
  },
  {
    id: "progress",
    header: "Progreso",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.progressSummary}
      </span>
    ),
  },
  {
    id: "external",
    header: "Ref. externa",
    cell: ({ row }) =>
      row.original.externalOrderId ? (
        <span className="font-mono text-xs">
          {row.original.externalOrderId.slice(0, 12)}
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      ),
  },
  {
    id: "createdAt",
    header: "Creada",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {formatDateTime(row.original.createdAt)}
      </span>
    ),
  },
  {
    id: "updatedAt",
    header: "Actualizada",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {formatDateTime(row.original.updatedAt)}
      </span>
    ),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => <DeliveryActions delivery={row.original} />,
  },
];

export function DeliveriesTable({ data }: { data: DeliveryListItemDto[] }) {
  return (
    <DataTable
      columns={deliveriesColumns}
      data={data}
      manual
      hideToolbar
      hidePagination
      emptyMessage="No hay entregas para mostrar."
    />
  );
}
