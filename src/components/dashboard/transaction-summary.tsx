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
    <section aria-labelledby="transactions-heading" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2
          id="transactions-heading"
          className="font-heading text-lg font-semibold text-foreground"
        >
          Transacciones recientes
        </h2>
        {showViewAll ? (
          <Button
            variant="ghost"
            size="sm"
            render={<Link href="/dashboard/transactions" />}
            nativeButton={false}
            className="text-xs text-muted-foreground hover:text-foreground font-medium"
          >
            Ver todas
          </Button>
        ) : null}
      </div>

      <ul className="space-y-3">
        {transactions.map((tx) => (
          <li key={tx.id}>
            <Link
              href={`/dashboard/pedidos/${tx.orderId}`}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:bg-muted/10 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-1">
                <p className="font-semibold text-foreground text-sm leading-none">
                  Pedido <span className="font-mono">{tx.orderNumber}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {tx.methodLabel} · {formatDateTime(tx.createdAt)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <CustomerStatusBadge
                  label={tx.statusView.label}
                  tone={tx.statusView.tone}
                />
                <p className="font-heading text-base font-bold tabular-nums text-foreground">
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
