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
        "mt-2.5 flex items-center gap-1.5 font-mono text-[10px] tracking-wide",
        trend === "up" && "text-emerald-500",
        trend === "down" && "text-destructive",
        trend === "neutral" && "text-muted-foreground",
      )}
    >
      {trend === "up" ? (
        <span className="px-1 py-0.5 bg-emerald-500/10 border border-emerald-500/35 text-emerald-500 rounded-sm font-bold text-[9px]">
          ▲ UP
        </span>
      ) : null}
      {trend === "down" ? (
        <span className="px-1 py-0.5 bg-destructive/10 border border-destructive/35 text-destructive rounded-sm font-bold text-[9px]">
          ▼ DN
        </span>
      ) : null}
      {trend === "neutral" ? (
        <span className="px-1 py-0.5 bg-muted/40 border border-border/60 text-muted-foreground rounded-sm font-bold text-[9px]">
          ■ NC
        </span>
      ) : null}
      <span className="text-muted-foreground text-[10px] font-normal">{label}</span>
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
    <div className="rounded-sm border border-border/80 bg-muted/5 px-4 py-3 relative overflow-hidden group hover:border-border transition-colors">
      <div className="absolute top-0 right-0 p-1 font-mono text-[8px] text-muted-foreground/30 select-none group-hover:text-muted-foreground/50 transition-colors">
        [SYS_VAL]
      </div>
      <p className="font-mono text-[10px] tracking-wider uppercase text-muted-foreground">{title}</p>
      <p className="mt-1.5 font-mono text-xl font-bold tracking-tight tabular-nums text-foreground">
        {value}
      </p>
      {context ? (
        <p className="mt-1 font-mono text-[10px] text-muted-foreground/80">{context}</p>
      ) : null}
      <Trend trend={trend} label={comparisonLabel} />
    </div>
  );

  if (!href) return content;
  return (
    <Link href={href} className="transition-opacity hover:opacity-95">
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
