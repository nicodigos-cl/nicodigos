"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";

import { DeliveryStatusBadge } from "@/components/admin/deliveries/delivery-status-badge";
import { OrderStatusBadge } from "@/components/admin/orders/order-status-badge";
import { TransactionStatusBadge } from "@/components/admin/transactions/transaction-status-badge";
import { DataTable } from "@/components/data-table";
import type {
  DeliveryStatus,
  OrderStatus,
  PaymentStatus,
} from "@/generated/prisma/enums";
import { formatDateTime } from "@/lib/format-date";
import { formatMoney } from "@/lib/products/format";
import type {
  UserDeliveryRowDto,
  UserOrderRowDto,
  UserTransactionRowDto,
} from "@/types/users";

const orderColumns: ColumnDef<UserOrderRowDto>[] = [
  {
    accessorKey: "orderNumber",
    header: "Pedido",
    cell: ({ row }) => (
      <Link
        href={`/admin/orders/${row.original.id}`}
        className="font-medium hover:underline"
      >
        #{row.original.orderNumber}
      </Link>
    ),
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => (
      <OrderStatusBadge status={row.original.status as OrderStatus} />
    ),
  },
  {
    accessorKey: "total",
    header: "Total",
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatMoney(row.original.total, row.original.currency)}
      </span>
    ),
  },
  {
    accessorKey: "itemsCount",
    header: "Ítems",
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.itemsCount}</span>
    ),
  },
  {
    accessorKey: "paymentStatus",
    header: "Pago",
    cell: ({ row }) =>
      row.original.paymentStatus ? (
        <TransactionStatusBadge
          status={row.original.paymentStatus as PaymentStatus}
        />
      ) : (
        "—"
      ),
  },
  {
    accessorKey: "deliveryStatuses",
    header: "Entrega",
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {row.original.deliveryStatuses.length
          ? row.original.deliveryStatuses.join(", ")
          : "Sin iniciar"}
      </span>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Fecha",
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {formatDateTime(row.original.createdAt)}
      </span>
    ),
  },
];

const transactionColumns: ColumnDef<UserTransactionRowDto>[] = [
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) => (
      <Link
        href={`/admin/transactions/${row.original.id}`}
        className="font-mono text-xs hover:underline"
      >
        {row.original.id.slice(0, 12)}…
      </Link>
    ),
  },
  { accessorKey: "provider", header: "Proveedor" },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => (
      <TransactionStatusBadge status={row.original.status as PaymentStatus} />
    ),
  },
  {
    accessorKey: "amount",
    header: "Monto",
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatMoney(row.original.amount, row.original.currency)}
      </span>
    ),
  },
  {
    accessorKey: "orderNumber",
    header: "Pedido",
    cell: ({ row }) => (
      <Link
        href={`/admin/orders/${row.original.orderId}`}
        className="hover:underline"
      >
        #{row.original.orderNumber}
      </Link>
    ),
  },
  {
    accessorKey: "externalReference",
    header: "Referencia",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">
        {row.original.externalReference ?? "—"}
      </span>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Fecha",
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {formatDateTime(row.original.createdAt)}
      </span>
    ),
  },
];

const deliveryColumns: ColumnDef<UserDeliveryRowDto>[] = [
  {
    accessorKey: "productName",
    header: "Producto",
    cell: ({ row }) => (
      <Link
        href={`/admin/deliveries/${row.original.id}`}
        className="font-medium hover:underline"
      >
        {row.original.productName}
      </Link>
    ),
  },
  {
    accessorKey: "orderNumber",
    header: "Pedido",
    cell: ({ row }) => (
      <Link
        href={`/admin/orders/${row.original.orderId}`}
        className="hover:underline"
      >
        #{row.original.orderNumber}
      </Link>
    ),
  },
  { accessorKey: "method", header: "Método" },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => (
      <DeliveryStatusBadge status={row.original.status as DeliveryStatus} />
    ),
  },
  {
    accessorKey: "externalReference",
    header: "Referencia",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">
        {row.original.externalReference ?? "—"}
      </span>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Fecha",
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {formatDateTime(row.original.createdAt)}
      </span>
    ),
  },
];

type TableProps<T> = { data: T[] };

export function UserOrdersTable({ data }: TableProps<UserOrderRowDto>) {
  return (
    <DataTable
      columns={orderColumns}
      data={data}
      manual
      hideToolbar
      hidePagination
      tableClassName="min-w-[640px]"
      getRowId={(row) => row.id}
    />
  );
}

export function UserTransactionsTable({
  data,
}: TableProps<UserTransactionRowDto>) {
  return (
    <DataTable
      columns={transactionColumns}
      data={data}
      manual
      hideToolbar
      hidePagination
      tableClassName="min-w-[640px]"
      getRowId={(row) => row.id}
    />
  );
}

export function UserDeliveriesTable({ data }: TableProps<UserDeliveryRowDto>) {
  return (
    <DataTable
      columns={deliveryColumns}
      data={data}
      manual
      hideToolbar
      hidePagination
      tableClassName="min-w-[640px]"
      getRowId={(row) => row.id}
    />
  );
}
