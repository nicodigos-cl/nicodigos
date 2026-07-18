import Link from "next/link";

import type { CustomerDashboardMetrics } from "@/lib/customer-dashboard/types";
import { formatDateTime } from "@/lib/format-date";
import { formatMoney } from "@/lib/products/format";

const cards = [
  {
    key: "orders" as const,
    title: "Pedidos",
    href: "/dashboard/orders",
    linkLabel: "Ver mis pedidos",
  },
  {
    key: "availableDeliveries" as const,
    title: "Entregas disponibles",
    href: "/dashboard/deliveries?filter=available",
    linkLabel: "Ver mis entregas",
  },
  {
    key: "servicesInProgress" as const,
    title: "Servicios en progreso",
    href: "/dashboard/deliveries?filter=smm",
    linkLabel: "Ver servicios",
  },
  {
    key: "completedPurchases" as const,
    title: "Compras completadas",
    href: "/dashboard/orders?status=FULFILLED",
    linkLabel: "Ver historial",
  },
] as const;

export function CustomerMetrics({
  metrics,
}: {
  metrics: CustomerDashboardMetrics;
}) {
  return (
    <section aria-label="Resumen" className="space-y-3">
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <li key={card.key}>
            <Link
              href={card.href}
              className="flex h-full flex-col gap-2 rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-muted/40"
            >
              <p className="text-sm text-muted-foreground">{card.title}</p>
              <p className="font-heading text-2xl font-semibold tabular-nums">
                {metrics[card.key]}
              </p>
              <span className="text-sm text-primary">{card.linkLabel}</span>
            </Link>
          </li>
        ))}
      </ul>
      {metrics.totalSpent != null && metrics.totalSpentCurrency ? (
        <p className="text-sm text-muted-foreground">
          Total gastado:{" "}
          <span className="font-medium text-foreground tabular-nums">
            {formatMoney(metrics.totalSpent, metrics.totalSpentCurrency)}
          </span>
          {metrics.lastPurchaseAt
            ? ` · Última compra ${formatDateTime(metrics.lastPurchaseAt)}`
            : null}
        </p>
      ) : null}
    </section>
  );
}
