import Link from "next/link";
import {
  HiOutlineShoppingBag,
  HiOutlineTruck,
  HiOutlineClipboardList,
  HiOutlineBadgeCheck,
  HiOutlineArrowRight,
  HiOutlineCurrencyDollar,
  HiOutlineCalendar,
} from "react-icons/hi";

import type { CustomerDashboardMetrics } from "@/lib/customer-dashboard/types";
import { formatDateTime } from "@/lib/format-date";
import { formatMoney } from "@/lib/products/format";

const cards = [
  {
    key: "orders" as const,
    title: "Pedidos",
    href: "/dashboard/orders",
    linkLabel: "Ver mis pedidos",
    icon: HiOutlineShoppingBag,
    colorClass: "text-blue-500 bg-blue-500/10 dark:text-blue-400 dark:bg-blue-500/10",
  },
  {
    key: "availableDeliveries" as const,
    title: "Entregas disponibles",
    href: "/dashboard/deliveries?filter=available",
    linkLabel: "Ver mis entregas",
    icon: HiOutlineTruck,
    colorClass: "text-emerald-500 bg-emerald-500/10 dark:text-emerald-400 dark:bg-emerald-500/10",
  },
  {
    key: "servicesInProgress" as const,
    title: "Servicios en progreso",
    href: "/dashboard/deliveries?filter=smm",
    linkLabel: "Ver servicios",
    icon: HiOutlineClipboardList,
    colorClass: "text-amber-500 bg-amber-500/10 dark:text-amber-400 dark:bg-amber-500/10",
  },
  {
    key: "completedPurchases" as const,
    title: "Compras completadas",
    href: "/dashboard/orders?status=FULFILLED",
    linkLabel: "Ver historial",
    icon: HiOutlineBadgeCheck,
    colorClass: "text-violet-500 bg-violet-500/10 dark:text-violet-400 dark:bg-violet-500/10",
  },
] as const;

export function CustomerMetrics({
  metrics,
}: {
  metrics: CustomerDashboardMetrics;
}) {
  return (
    <section aria-label="Resumen" className="space-y-4">
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <li key={card.key}>
              <Link
                href={card.href}
                className="group relative flex h-full flex-col justify-between gap-4 rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-md hover:bg-muted/10"
              >
                <div className="flex items-start justify-between">
                  <span className="text-sm font-medium text-muted-foreground font-sans">
                    {card.title}
                  </span>
                  <div className={`rounded-xl p-2.5 transition-colors ${card.colorClass} group-hover:scale-105 transition-transform duration-300`}>
                    <Icon className="size-5" />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="font-heading text-3xl font-bold tracking-tight tabular-nums text-foreground">
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
      {metrics.totalSpent != null && metrics.totalSpentCurrency ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-muted/20 px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <HiOutlineCurrencyDollar className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-sans">Total invertido</p>
              <p className="font-heading text-base font-semibold tabular-nums text-foreground">
                {formatMoney(metrics.totalSpent, metrics.totalSpentCurrency)}
              </p>
            </div>
          </div>
          {metrics.lastPurchaseAt ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground border-t border-border pt-2 sm:border-t-0 sm:pt-0">
              <HiOutlineCalendar className="size-4" />
              <span>
                Última compra:{" "}
                <span className="font-medium text-foreground">
                  {formatDateTime(metrics.lastPurchaseAt)}
                </span>
              </span>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
