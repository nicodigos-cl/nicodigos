import Link from "next/link";
import {
  HiOutlineArrowRight,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineCreditCard,
  HiOutlineExclamationCircle,
} from "react-icons/hi";

import {
  CUSTOMER_TRANSACTIONS_PATH,
  customerTransactionsPath,
} from "@/lib/customer-dashboard/paths";
import type { CustomerTransactionMetrics } from "@/lib/customer-dashboard/types";
import { cn } from "@/lib/utils";

const cards = [
  {
    key: "totalTransactions" as const,
    title: "Transacciones totales",
    href: CUSTOMER_TRANSACTIONS_PATH,
    linkLabel: "Ver todas",
    icon: HiOutlineCreditCard,
    isActive: (activeStatus?: string) =>
      !activeStatus || activeStatus === "all",
  },
  {
    key: "paid" as const,
    title: "Pagadas",
    href: customerTransactionsPath({ status: "paid" }),
    linkLabel: "Ver pagadas",
    icon: HiOutlineCheckCircle,
    isActive: (activeStatus?: string) => activeStatus === "paid",
  },
  {
    key: "pending" as const,
    title: "Pendientes",
    href: customerTransactionsPath({ status: "pending" }),
    linkLabel: "Ver pendientes",
    icon: HiOutlineClock,
    isActive: (activeStatus?: string) => activeStatus === "pending",
  },
  {
    key: "failed" as const,
    title: "Fallidas",
    href: customerTransactionsPath({ status: "failed" }),
    linkLabel: "Ver fallidas",
    icon: HiOutlineExclamationCircle,
    isActive: (activeStatus?: string) => activeStatus === "failed",
  },
] as const;

export function TransactionsSummary({
  metrics,
  activeStatus,
}: {
  metrics: CustomerTransactionMetrics;
  activeStatus?: string;
}) {
  return (
    <section aria-label="Resumen de transacciones" className="space-y-4">
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          const active = card.isActive(activeStatus);

          return (
            <li key={card.key}>
              <Link
                href={card.href}
                className={cn(
                  "group flex h-full flex-col justify-between gap-4 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/30 hover:bg-muted/10",
                  active && "border-primary ring-1 ring-primary/20",
                )}
              >
                <div className="flex items-start justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </span>
                  <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
                    <Icon className="size-5" />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="font-heading text-3xl font-bold tabular-nums tracking-tight text-foreground">
                    {metrics[card.key]}
                  </p>
                  <div className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                    <span>{card.linkLabel}</span>
                    <HiOutlineArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
