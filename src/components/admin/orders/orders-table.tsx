"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import {
  HiOutlineClipboardCopy,
  HiOutlineDotsHorizontal,
  HiOutlineExternalLink,
  HiOutlineEye,
} from "react-icons/hi";
import { toast } from "sonner";

import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/components/admin/orders/order-status-badge";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDateTime } from "@/lib/format-date";
import { formatMoney } from "@/lib/products/format";
import type { OrderListItemDto } from "@/types/orders";

function OrderActions({ order }: { order: OrderListItemDto }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label="Acciones" />}
      >
        <HiOutlineDotsHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          render={<Link href={`/admin/orders/${order.id}`} />}
        >
          <HiOutlineEye className="size-4" />
          Ver detalle
        </DropdownMenuItem>
        <DropdownMenuItem
          render={
            <Link
              href={`/checkout?orderId=${encodeURIComponent(order.id)}`}
              target="_blank"
            />
          }
        >
          <HiOutlineExternalLink className="size-4" />
          Abrir checkout
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            void navigator.clipboard.writeText(order.id);
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

export const ordersColumns: ColumnDef<OrderListItemDto>[] = [
  {
    accessorKey: "id",
    header: "Orden",
    cell: ({ row }) => {
      const order = row.original;
      return (
        <div className="min-w-0 max-w-56">
          <Link
            href={`/admin/orders/${order.id}`}
            className="block truncate font-medium hover:underline"
          >
            {order.customerName || order.email}
          </Link>
          <p className="truncate font-mono text-xs text-muted-foreground">
            {order.id.slice(0, 12)}…
          </p>
        </div>
      );
    },
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => (
      <span className="text-sm">{row.original.email}</span>
    ),
  },
  {
    id: "status",
    header: "Estado",
    cell: ({ row }) => <OrderStatusBadge status={row.original.status} />,
  },
  {
    id: "payment",
    header: "Pago",
    cell: ({ row }) =>
      row.original.latestPaymentStatus ? (
        <PaymentStatusBadge status={row.original.latestPaymentStatus} />
      ) : (
        <span className="text-sm text-muted-foreground">Sin pago</span>
      ),
  },
  {
    id: "items",
    header: "Ítems",
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
    id: "createdAt",
    header: "Creada",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {formatDateTime(row.original.createdAt)}
      </span>
    ),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => <OrderActions order={row.original} />,
  },
];

export function OrdersTable({ data }: { data: OrderListItemDto[] }) {
  return (
    <DataTable
      columns={ordersColumns}
      data={data}
      manual
      hideToolbar
      hidePagination
      emptyMessage="No hay órdenes para mostrar."
    />
  );
}
