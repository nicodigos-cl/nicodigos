import Link from "next/link";
import { HiOutlineCreditCard } from "react-icons/hi";

import { CustomerStatusBadge } from "@/components/dashboard/customer-status-badge";
import { Button } from "@/components/ui/button";
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

export function TransactionSummary({
  transactions,
  showViewAll = true,
}: {
  transactions: CustomerTransactionSummary[];
  showViewAll?: boolean;
}) {
  if (transactions.length === 0) {
    return (
      <section className="space-y-3">
        <h2 className="font-heading text-lg font-semibold">Transacciones</h2>
        <Empty className="border border-border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HiOutlineCreditCard className="size-5" />
            </EmptyMedia>
            <EmptyTitle>Sin transacciones recientes</EmptyTitle>
            <EmptyDescription>
              Todavía no tienes transacciones para mostrar aquí.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </section>
    );
  }

  return (
    <section aria-labelledby="transactions-heading" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2
          id="transactions-heading"
          className="font-heading text-lg font-semibold"
        >
          Transacciones recientes
        </h2>
        {showViewAll ? (
          <Button
            variant="ghost"
            size="sm"
            render={<Link href="/dashboard/transactions" />}
            nativeButton={false}
          >
            Ver todas
          </Button>
        ) : null}
      </div>

      <ul className="space-y-2">
        {transactions.map((tx) => (
          <li key={tx.id}>
            <Link
              href={`/dashboard/orders/${tx.orderId}`}
              className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-1">
                <p className="font-medium">{tx.orderNumber}</p>
                <p className="text-sm text-muted-foreground">
                  {tx.methodLabel} · {formatDateTime(tx.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <CustomerStatusBadge
                  label={tx.statusView.label}
                  tone={tx.statusView.tone}
                />
                <p className="font-medium tabular-nums">
                  {formatMoney(tx.amount, tx.currency)}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
