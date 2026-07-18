import Link from "next/link";
import { HiOutlineTruck } from "react-icons/hi";

import { CustomerStatusBadge } from "@/components/dashboard/customer-status-badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { CustomerDeliverySummary } from "@/lib/customer-dashboard/types";
import { formatDateTime } from "@/lib/format-date";

export function RecentDeliveries({
  deliveries,
  showViewAll = true,
}: {
  deliveries: CustomerDeliverySummary[];
  showViewAll?: boolean;
}) {
  if (deliveries.length === 0) {
    return (
      <section className="space-y-3">
        <h2 className="font-heading text-lg font-semibold">Entregas</h2>
        <Empty className="border border-border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HiOutlineTruck className="size-5" />
            </EmptyMedia>
            <EmptyTitle>Sin entregas recientes</EmptyTitle>
            <EmptyDescription>
              Todavía no tienes entregas para mostrar aquí.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </section>
    );
  }

  return (
    <section aria-labelledby="recent-deliveries-heading" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2
          id="recent-deliveries-heading"
          className="font-heading text-lg font-semibold text-foreground"
        >
          Entregas recientes
        </h2>
        {showViewAll ? (
          <Button
            variant="ghost"
            size="sm"
            render={<Link href="/dashboard/deliveries" />}
            nativeButton={false}
            className="text-xs text-muted-foreground hover:text-foreground font-medium"
          >
            Ver todas
          </Button>
        ) : null}
      </div>

      <ul className="space-y-3">
        {deliveries.map((delivery) => (
          <li
            key={delivery.id}
            className="group rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:border-primary/20 hover:bg-muted/10"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2 min-w-0 flex-1">
                <p className="font-semibold text-foreground text-base leading-snug truncate">
                  {delivery.productName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {delivery.methodLabel} · Pedido <span className="font-mono">{delivery.orderNumber}</span> ·{" "}
                  {formatDateTime(delivery.deliveredAt ?? delivery.createdAt)}
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <CustomerStatusBadge
                    label={
                      delivery.smm?.statusView.label ??
                      delivery.statusView.label
                    }
                    tone={
                      delivery.smm?.statusView.tone ?? delivery.statusView.tone
                    }
                  />
                  {delivery.hasSecretsAvailable ? (
                    <CustomerStatusBadge
                      label="Contenido listo"
                      tone="success"
                    />
                  ) : null}
                </div>
                {delivery.smm?.progressPercent != null ? (
                  <div className="pt-3 max-w-md">
                    <div
                      className="h-2 overflow-hidden rounded-full bg-muted"
                      role="progressbar"
                      aria-valuenow={Math.round(delivery.smm.progressPercent)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="Progreso del servicio"
                    >
                      <div
                        className="h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none"
                        style={{
                          width: `${delivery.smm.progressPercent}%`,
                        }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground font-medium">
                      {Math.round(delivery.smm.progressPercent)}% completado
                    </p>
                  </div>
                ) : null}
              </div>
              <div className="shrink-0 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  render={<Link href={delivery.primaryAction.href} />}
                  nativeButton={false}
                  className="w-full sm:w-auto font-medium"
                >
                  {delivery.primaryAction.label}
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
