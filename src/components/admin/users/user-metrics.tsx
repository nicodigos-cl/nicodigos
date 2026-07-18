import type { UserMetricsDto } from "@/types/users";

export function UserMetrics({ metrics }: { metrics: UserMetricsDto }) {
  const cards = [
    ["Usuarios totales", metrics.total],
    ["Nuevos en el periodo", metrics.newInPeriod],
    ["Con pedidos", metrics.withOrders],
    ["Con compras", metrics.withCompletedPurchases],
    ["Administradores", metrics.admins],
    ["Bloqueados / restringidos", metrics.blockedOrRestricted],
    ["Actividad reciente", metrics.recentlyActive],
    ["Requieren revisión", metrics.needsReview],
  ] as const;

  return (
    <div className="space-y-2">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl border border-border bg-card px-4 py-3"
          >
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 font-heading text-xl font-semibold tabular-nums">
              {value}
            </p>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {metrics.scope === "filtered"
          ? "Métricas del conjunto filtrado actual."
          : "Métricas globales de todos los usuarios."}{" "}
        Periodo de altas: últimos 30 días o el rango de registro aplicado.
      </p>
    </div>
  );
}
