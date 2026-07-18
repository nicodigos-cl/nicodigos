"use client";

import Link from "next/link";
import { HiOutlineCreditCard } from "react-icons/hi";

import { CustomerStatusBadge } from "@/components/dashboard/customer-status-badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { CustomerTransactionSummary } from "@/lib/customer-dashboard/types";
import { formatDateTime } from "@/lib/format-date";
import { formatMoney } from "@/lib/products/format";

export function CustomerTransactionsMobileList({
  data,
}: {
  data: CustomerTransactionSummary[];
}) {
  if (data.length === 0) {
    return (
      <Empty className="border border-border bg-card">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HiOutlineCreditCard className="size-5" />
          </EmptyMedia>
          <EmptyTitle>Sin transacciones</EmptyTitle>
          <EmptyDescription>
            Todavía no hay pagos asociados a tus pedidos.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {data.map((tx) => (
        <li key={tx.id}>
          <Link
            href={`/dashboard/pedidos/${tx.orderId}`}
            className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-muted/40"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="font-medium">{tx.orderNumber}</p>
                <p className="text-sm text-muted-foreground">
                  {tx.methodLabel} · {formatDateTime(tx.createdAt)}
                </p>
              </div>
              <p className="font-medium tabular-nums">
                {formatMoney(tx.amount, tx.currency)}
              </p>
            </div>
            <CustomerStatusBadge
              label={tx.statusView.label}
              tone={tx.statusView.tone}
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
