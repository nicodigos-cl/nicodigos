import Link from "next/link";
import { HiOutlineArrowDown, HiOutlineArrowUp } from "react-icons/hi";

import type {
  DashboardCountMetric,
  DashboardMoneyMetric,
} from "@/lib/dashboard/metrics";
import { cn } from "@/lib/utils";

function Trend({
  trend,
  label,
}: {
  trend: "up" | "down" | "neutral";
  label: string;
}) {
  return (
    <p
      className={cn(
        "mt-2 flex items-center gap-1 text-xs",
        trend === "up" && "text-primary",
        trend === "down" && "text-destructive",
        trend === "neutral" && "text-muted-foreground",
      )}
    >
      {trend === "up" ? <HiOutlineArrowUp className="size-3" /> : null}
      {trend === "down" ? <HiOutlineArrowDown className="size-3" /> : null}
      <span>{label}</span>
    </p>
  );
}

function MetricCard({
  title,
  value,
  trend,
  comparisonLabel,
  context,
  href,
}: {
  title: string;
  value: string | number;
  trend: "up" | "down" | "neutral";
  comparisonLabel: string;
  context?: string;
  href?: string;
}) {
  const content = (
    <div className="rounded-2xl border border-border bg-card px-4 py-3">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="mt-1 font-heading text-xl font-semibold tabular-nums">
        {value}
      </p>
      {context ? (
        <p className="mt-1 text-xs text-muted-foreground">{context}</p>
      ) : null}
      <Trend trend={trend} label={comparisonLabel} />
    </div>
  );

  if (!href) return content;
  return (
    <Link href={href} className="transition-opacity hover:opacity-90">
      {content}
    </Link>
  );
}

export function DashboardMetrics({
  metrics,
  marginPercentage,
}: {
  metrics: {
    grossSales: DashboardMoneyMetric;
    refunds: DashboardMoneyMetric;
    netSales: DashboardMoneyMetric;
    estimatedProfit: DashboardMoneyMetric;
    orders: DashboardCountMetric;
    averageTicket: DashboardMoneyMetric;
    buyers: DashboardCountMetric;
    approvedPayments: DashboardCountMetric;
    completedDeliveries: DashboardCountMetric;
  };
  marginPercentage: number | null;
}) {
  const cards = [
    {
      title: "Ventas brutas",
      value: metrics.grossSales.formattedValue,
      trend: metrics.grossSales.trend,
      comparisonLabel: metrics.grossSales.comparisonLabel,
      context: "Pagos aprobados",
      href: "/admin/transactions?status=PAID",
    },
    {
      title: "Reembolsos",
      value: metrics.refunds.formattedValue,
      trend: metrics.refunds.trend,
      comparisonLabel: metrics.refunds.comparisonLabel,
      context: "Confirmados en el periodo",
      href: "/admin/transactions?status=REFUNDED",
    },
    {
      title: "Ventas netas",
      value: metrics.netSales.formattedValue,
      trend: metrics.netSales.trend,
      comparisonLabel: metrics.netSales.comparisonLabel,
      context: "Bruto − reembolsos",
      href: "/admin/transactions?status=PAID",
    },
    {
      title: "Ganancia estimada",
      value: metrics.estimatedProfit.formattedValue,
      trend: metrics.estimatedProfit.trend,
      comparisonLabel: metrics.estimatedProfit.comparisonLabel,
      context:
        marginPercentage == null
          ? "Neto − costo estimado"
          : `Margen ${marginPercentage.toFixed(1)}%`,
    },
    {
      title: "Pedidos",
      value: metrics.orders.value,
      trend: metrics.orders.trend,
      comparisonLabel: metrics.orders.comparisonLabel,
      context: metrics.orders.context,
      href: "/admin/orders",
    },
    {
      title: "Ticket promedio",
      value: metrics.averageTicket.formattedValue,
      trend: metrics.averageTicket.trend,
      comparisonLabel: metrics.averageTicket.comparisonLabel,
      context: "Sobre ventas netas",
    },
    {
      title: "Compradores",
      value: metrics.buyers.value,
      trend: metrics.buyers.trend,
      comparisonLabel: metrics.buyers.comparisonLabel,
      href: "/admin/users?withApprovedPurchases=true",
    },
    {
      title: "Pagos aprobados",
      value: metrics.approvedPayments.value,
      trend: metrics.approvedPayments.trend,
      comparisonLabel: metrics.approvedPayments.comparisonLabel,
      href: "/admin/transactions?status=PAID",
    },
    {
      title: "Entregas completadas",
      value: metrics.completedDeliveries.value,
      trend: metrics.completedDeliveries.trend,
      comparisonLabel: metrics.completedDeliveries.comparisonLabel,
      href: "/admin/deliveries?status=DELIVERED",
    },
  ] as const;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => (
        <MetricCard key={card.title} {...card} />
      ))}
    </div>
  );
}
