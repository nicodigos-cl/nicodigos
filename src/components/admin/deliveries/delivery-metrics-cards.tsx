import type { DeliveryMetricsDto } from "@/types/deliveries";

const cards = [
  { key: "pending", label: "Pendientes" },
  { key: "processing", label: "Procesando" },
  { key: "delivered", label: "Entregadas" },
  { key: "failed", label: "Fallidas" },
  { key: "needsManual", label: "Requieren atención" },
] as const;

export function DeliveryMetricsCards({
  metrics,
}: {
  metrics: DeliveryMetricsDto;
}) {
  return (
    <div className="space-y-2">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((card) => (
          <div
            key={card.key}
            className="rounded-2xl border border-border bg-card px-4 py-3"
          >
            <p className="text-xs text-muted-foreground">{card.label}</p>
            <p className="mt-1 font-heading text-2xl font-semibold tabular-nums">
              {metrics[card.key]}
            </p>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {metrics.scope === "filtered"
          ? "Métricas según filtros activos (excepto estado)."
          : "Métricas globales de todas las entregas."}
      </p>
    </div>
  );
}
