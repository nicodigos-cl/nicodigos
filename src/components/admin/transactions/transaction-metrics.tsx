import { formatMoney } from "@/lib/products/format";
import type { TransactionMetricsDto } from "@/types/transactions";

export function TransactionMetrics({ metrics }: { metrics: TransactionMetricsDto }) {
  const cards = [
    ["Total", metrics.total], ["Pendientes", metrics.pending], ["Aprobadas", metrics.approved], ["Fallidas", metrics.failed], ["Reembolsadas", metrics.refunded],
    ["Monto aprobado", formatMoney(metrics.approvedAmount, metrics.currency)], ["Monto reembolsado", formatMoney(metrics.refundedAmount, metrics.currency)], ["Requieren revisión", metrics.requiresReview],
  ] as const;
  return <div className="space-y-2"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{cards.map(([label, value]) => <div key={label} className="rounded-2xl border border-border bg-card px-4 py-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-heading text-xl font-semibold tabular-nums">{value}</p></div>)}</div><p className="text-xs text-muted-foreground">{metrics.scope === "filtered" ? "Métricas del conjunto filtrado (el filtro de estado se omite para comparar categorías)." : "Métricas históricas globales de todas las transacciones."}</p></div>;
}
