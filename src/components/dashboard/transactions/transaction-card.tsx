import Link from "next/link";
import { HiOutlineCreditCard } from "react-icons/hi";

import { CustomerStatusBadge } from "@/components/dashboard/customer-status-badge";
import { Button } from "@/components/ui/button";
import { formatCustomerDate } from "@/lib/customer-dashboard/format";
import { customerOrderPath } from "@/lib/customer-dashboard/paths";
import type { CustomerTransactionSummary } from "@/lib/customer-dashboard/types";
import { formatMoney } from "@/lib/products/format";

export function TransactionCard({
  transaction,
}: {
  transaction: CustomerTransactionSummary;
}) {
  return (
    <article className="rounded-2xl border border-border bg-card p-4">
      <Link
        href={customerOrderPath(transaction.orderId)}
        className="block space-y-3 transition-colors hover:opacity-90"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="font-medium">Pedido #{transaction.orderNumber}</p>
            <p className="text-sm text-muted-foreground">
              {transaction.methodLabel} ·{" "}
              {formatCustomerDate(transaction.createdAt)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <p className="shrink-0 font-medium tabular-nums">
              {formatMoney(transaction.amount, transaction.currency)}
            </p>
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <HiOutlineCreditCard className="size-4" />
            </div>
          </div>
        </div>

        <CustomerStatusBadge
          label={transaction.statusView.label}
          tone={transaction.statusView.tone}
        />
      </Link>

      <div className="mt-4 border-t border-border pt-4">
        <Button
          size="sm"
          variant="outline"
          render={<Link href={customerOrderPath(transaction.orderId)} />}
          nativeButton={false}
          className="w-full sm:w-auto"
        >
          Ver pedido
        </Button>
      </div>
    </article>
  );
}
