"use client";

import Link from "next/link";
import { HiOutlineShoppingBag } from "react-icons/hi";

import { CustomerStatusBadge } from "@/components/dashboard/customer-status-badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { CustomerOrderSummary } from "@/lib/customer-dashboard/types";
import { formatDateTime } from "@/lib/format-date";
import { formatMoney } from "@/lib/products/format";

export function CustomerOrdersMobileList({
  data,
}: {
  data: CustomerOrderSummary[];
}) {
  if (data.length === 0) {
    return (
      <Empty className="border border-border bg-card">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HiOutlineShoppingBag className="size-5" />
          </EmptyMedia>
          <EmptyTitle>Sin pedidos</EmptyTitle>
          <EmptyDescription>
            No hay pedidos para mostrar con los filtros actuales.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {data.map((order) => (
        <li key={order.id}>
          <Link
            href={`/dashboard/orders/${order.id}`}
            className="block rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-muted/40"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <p className="font-medium">{order.number}</p>
                <p className="text-sm text-muted-foreground">
                  {formatDateTime(order.createdAt)} · {order.itemsCount}{" "}
                  producto(s)
                </p>
              </div>
              <p className="font-medium tabular-nums">
                {formatMoney(order.total, order.currency)}
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <CustomerStatusBadge
                label={order.statusView.label}
                tone={order.statusView.tone}
              />
              {order.paymentStatusView ? (
                <CustomerStatusBadge
                  label={order.paymentStatusView.label}
                  tone={order.paymentStatusView.tone}
                />
              ) : null}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
