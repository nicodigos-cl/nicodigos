import Link from "next/link";
import { HiOutlineChartBar, HiOutlineClipboardList } from "react-icons/hi";

import { DashboardEmpty } from "@/components/admin/dashboard/dashboard-empty";
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
    <section className="rounded-sm border border-border/80 bg-muted/5 p-4 sm:p-5 font-mono text-xs relative overflow-hidden">
      <div className="absolute top-0 right-0 p-1 text-[8px] text-muted-foreground/30 select-none">
        [SYS_QUEUE]
      </div>
      <h2 className="text-xs font-bold uppercase tracking-wider text-foreground mb-3">{title}</h2>
      {items.length === 0 ? (
        <DashboardEmpty
          icon={HiOutlineClipboardList}
          title="Sin registros"
          description="No hay datos de estado para mostrar."
        />
      ) : (
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.status}>
              <Link
                href={item.href}
                className="flex items-center justify-between py-1.5 hover:text-primary transition-colors border-b border-dashed border-border/40 last:border-0 group"
              >
                <span className="text-muted-foreground group-hover:text-primary transition-colors">{item.label}</span>
                <span className="flex-1 border-b border-dotted border-border/50 mx-2" />
                <Badge variant="secondary" className="rounded-sm font-mono text-xs tabular-nums font-bold border-border/60">
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
      <section className="rounded-sm border border-border/80 bg-muted/5 p-4 sm:p-5 font-mono text-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 p-1 text-[8px] text-muted-foreground/30 select-none">
          [SYS_OPS]
        </div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-foreground mb-3">Estado operativo</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {ops.map(([label, value, href]) => (
            <li key={label}>
              <Link
                href={href}
                className="flex items-center justify-between rounded-sm border border-border/60 bg-background/50 px-3 py-2 hover:border-primary hover:bg-background transition-colors"
              >
                <span className="text-muted-foreground">{label}</span>
                <span className="font-bold tabular-nums text-primary">{value}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-sm border border-border/80 bg-muted/5 p-4 sm:p-5 font-mono text-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 p-1 text-[8px] text-muted-foreground/30 select-none">
          [SYS_DIST]
        </div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-foreground mb-3">Ventas por entrega</h2>
        {data.salesByDeliveryMethod.length === 0 ? (
          <DashboardEmpty
            icon={HiOutlineChartBar}
            title="Sin registros"
            description="Sin ventas por método de entrega en este periodo."
          />
        ) : (
          <ul className="space-y-1">
            {data.salesByDeliveryMethod.map((row) => (
              <li
                key={row.method}
                className="flex items-center justify-between py-1.5 border-b border-dashed border-border/40 last:border-0"
              >
                <span className="text-muted-foreground">{row.label}</span>
                <span className="flex-1 border-b border-dotted border-border/50 mx-2" />
                <span className="tabular-nums font-bold text-foreground">
                  {row.formattedSales}
                  {row.share > 0
                    ? ` (${row.share.toLocaleString("es-CL", { maximumFractionDigits: 0 })}%)`
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

      <section className="rounded-sm border border-border/80 bg-muted/5 p-4 sm:p-5 font-mono text-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 p-1 text-[8px] text-muted-foreground/30 select-none">
          [SYS_INVENTORY]
        </div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-foreground mb-3">Inventario digital</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs">
          <div className="flex items-center justify-between py-1.5 border-b border-dashed border-border/40">
            <dt className="text-muted-foreground">Keys disponibles</dt>
            <dd className="font-bold tabular-nums text-foreground">
              {data.inventory.keysAvailable}
            </dd>
          </div>
          <div className="flex items-center justify-between py-1.5 border-b border-dashed border-border/40">
            <dt className="text-muted-foreground">Keys reservadas</dt>
            <dd className="font-bold tabular-nums text-foreground">
              {data.inventory.keysReserved}
            </dd>
          </div>
          <div className="flex items-center justify-between py-1.5 border-b border-dashed border-border/40">
            <dt className="text-muted-foreground">Keys entregadas</dt>
            <dd className="font-bold tabular-nums text-foreground">
              {data.inventory.keysSold}
            </dd>
          </div>
          <div className="flex items-center justify-between py-1.5 border-b border-dashed border-border/40">
            <dt className="text-muted-foreground">Bajo stock</dt>
            <dd className="font-bold tabular-nums text-foreground">
              {data.inventory.lowStockProducts}
            </dd>
          </div>
          <div className="flex items-center justify-between py-1.5 border-b border-dashed border-border/40 sm:border-0">
            <dt className="text-muted-foreground">Activos sin stock</dt>
            <dd className="font-bold tabular-nums text-foreground">
              {data.inventory.activeWithoutStock}
            </dd>
          </div>
          <div className="flex items-center justify-between py-1.5 border-b border-dashed border-border/40 sm:border-0 border-0">
            <dt className="text-muted-foreground">Manuales activos</dt>
            <dd className="font-bold tabular-nums text-foreground">
              {data.inventory.activeManualProducts}
            </dd>
          </div>
        </dl>
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-sm border border-border/50 bg-background/50 px-3 py-2">
            <p className="text-[10px] text-muted-foreground uppercase">SMM pendientes</p>
            <p className="font-bold tabular-nums mt-0.5 text-foreground">{data.smm.pending}</p>
          </div>
          <div className="rounded-sm border border-border/50 bg-background/50 px-3 py-2">
            <p className="text-[10px] text-muted-foreground uppercase">SMM en progreso</p>
            <p className="font-bold tabular-nums mt-0.5 text-foreground">{data.smm.processing}</p>
          </div>
          <div className="rounded-sm border border-border/50 bg-background/50 px-3 py-2">
            <p className="text-[10px] text-muted-foreground uppercase">SMM completados</p>
            <p className="font-bold tabular-nums mt-0.5 text-foreground">{data.smm.delivered}</p>
          </div>
          <div className="rounded-sm border border-border/50 bg-background/50 px-3 py-2">
            <p className="text-[10px] text-muted-foreground uppercase">SMM fallidos</p>
            <p className="font-bold tabular-nums mt-0.5 text-foreground">{data.smm.failed}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
