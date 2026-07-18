"use client";

import Link from "next/link";
import { HiOutlineShoppingBag } from "react-icons/hi";

import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/components/admin/orders/order-status-badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { formatDateTime } from "@/lib/format-date";
import { formatMoney } from "@/lib/products/format";
import type { OrderListItemDto } from "@/types/orders";

export function OrdersMobileList({ data }: { data: OrderListItemDto[] }) {
  if (data.length === 0) {
    return (
      <Empty className="border border-border bg-card">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HiOutlineShoppingBag className="size-5" />
          </EmptyMedia>
          <EmptyTitle>Sin órdenes</EmptyTitle>
          <EmptyDescription>
            No hay órdenes para mostrar con los filtros actuales.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {data.map((order) => (
        <li
          key={order.id}
          className="rounded-2xl border border-border bg-card p-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link
                href={`/admin/orders/${order.id}`}
                className="block truncate font-medium hover:underline"
              >
                {order.customerName || order.email}
              </Link>
              <p className="truncate text-xs text-muted-foreground">
                {order.email}
              </p>
            </div>
            <OrderStatusBadge status={order.status} />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            {order.latestPaymentStatus ? (
              <PaymentStatusBadge status={order.latestPaymentStatus} />
            ) : null}
            <span className="font-medium tabular-nums">
              {formatMoney(order.total, order.currency)}
            </span>
            <span className="text-muted-foreground">
              {order.itemsCount} ítems
            </span>
            <span className="text-muted-foreground">
              {formatDateTime(order.createdAt)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
