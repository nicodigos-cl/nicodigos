import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { AdminDashboardDto } from "@/types/dashboard";

function StatusList({
  title,
  items,
}: {
  title: string;
  items: AdminDashboardDto["orderStatuses"];
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
      <h2 className="text-sm font-medium">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Sin datos.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li key={item.status}>
              <Link
                href={item.href}
                className="flex items-center justify-between gap-3 rounded-xl px-2 py-1.5 text-sm hover:bg-muted/50"
              >
                <span>{item.label}</span>
                <Badge variant="secondary" className="tabular-nums">
                  {item.count}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function DashboardOperationalPanels({
  data,
}: {
  data: Pick<
    AdminDashboardDto,
    | "operational"
    | "orderStatuses"
    | "transactionStatuses"
    | "deliveryStatuses"
    | "inventory"
    | "smm"
    | "salesByDeliveryMethod"
  >;
}) {
  const ops = [
    ["Pedidos pendientes", data.operational.pendingOrders, "/admin/orders?status=PENDING"],
    ["Pagos pendientes", data.operational.pendingPayments, "/admin/transactions?status=PENDING"],
    ["Pagos fallidos (24h)", data.operational.failedPayments, "/admin/transactions?status=FAILED"],
    ["Entregas pendientes", data.operational.pendingDeliveries, "/admin/deliveries?status=PENDING"],
    ["Entregas fallidas", data.operational.failedDeliveries, "/admin/deliveries?status=FAILED"],
    ["SMM en progreso", data.operational.smmProcessing, "/admin/deliveries?method=SMM&status=PROCESSING"],
    ["SMM con error", data.operational.smmFailed, "/admin/deliveries?method=SMM&status=FAILED"],
    ["Reembolsos pendientes", data.operational.pendingRefunds, "/admin/transactions?refunded=true"],
    ["Requieren revisión", data.operational.requiresReview, "/admin/transactions?requiresReview=true"],
  ] as const;

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
        <h2 className="text-sm font-medium">Estado operativo</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {ops.map(([label, value, href]) => (
            <li key={label}>
              <Link
                href={href}
                className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2 text-sm hover:bg-muted/40"
              >
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium tabular-nums">{value}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
        <h2 className="text-sm font-medium">Ventas por entrega</h2>
        {data.salesByDeliveryMethod.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Sin ventas en el periodo.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {data.salesByDeliveryMethod.map((row) => (
              <li
                key={row.method}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span>{row.label}</span>
                <span className="tabular-nums text-muted-foreground">
                  {row.formattedSales}
                  {row.share > 0
                    ? ` · ${row.share.toLocaleString("es-CL", { maximumFractionDigits: 0 })} %`
                    : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <StatusList title="Pedidos por estado" items={data.orderStatuses} />
      <StatusList
        title="Transacciones por estado"
        items={data.transactionStatuses}
      />
      <StatusList title="Entregas por estado" items={data.deliveryStatuses} />

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
        <h2 className="text-sm font-medium">Inventario digital</h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Keys disponibles</dt>
            <dd className="font-medium tabular-nums">
              {data.inventory.keysAvailable}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Keys reservadas</dt>
            <dd className="font-medium tabular-nums">
              {data.inventory.keysReserved}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Keys entregadas</dt>
            <dd className="font-medium tabular-nums">
              {data.inventory.keysSold}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Bajo stock</dt>
            <dd className="font-medium tabular-nums">
              {data.inventory.lowStockProducts}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Activos sin stock</dt>
            <dd className="font-medium tabular-nums">
              {data.inventory.activeWithoutStock}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Manuales activos</dt>
            <dd className="font-medium tabular-nums">
              {data.inventory.activeManualProducts}
            </dd>
          </div>
        </dl>
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl bg-muted/40 px-3 py-2">
            <p className="text-xs text-muted-foreground">SMM pendientes</p>
            <p className="font-medium tabular-nums">{data.smm.pending}</p>
          </div>
          <div className="rounded-xl bg-muted/40 px-3 py-2">
            <p className="text-xs text-muted-foreground">SMM en progreso</p>
            <p className="font-medium tabular-nums">{data.smm.processing}</p>
          </div>
          <div className="rounded-xl bg-muted/40 px-3 py-2">
            <p className="text-xs text-muted-foreground">SMM completados</p>
            <p className="font-medium tabular-nums">{data.smm.delivered}</p>
          </div>
          <div className="rounded-xl bg-muted/40 px-3 py-2">
            <p className="text-xs text-muted-foreground">SMM fallidos</p>
            <p className="font-medium tabular-nums">{data.smm.failed}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
