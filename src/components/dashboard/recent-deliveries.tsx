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
    <section aria-labelledby="recent-deliveries-heading" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2
          id="recent-deliveries-heading"
          className="font-heading text-lg font-semibold"
        >
          Entregas recientes
        </h2>
        {showViewAll ? (
          <Button
            variant="ghost"
            size="sm"
            render={<Link href="/dashboard/deliveries" />}
            nativeButton={false}
          >
            Ver todas
          </Button>
        ) : null}
      </div>

      <ul className="space-y-3">
        {deliveries.map((delivery) => (
          <li
            key={delivery.id}
            className="rounded-2xl border border-border bg-card p-4"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="font-medium">{delivery.productName}</p>
                <p className="text-sm text-muted-foreground">
                  {delivery.methodLabel} · Pedido {delivery.orderNumber} ·{" "}
                  {formatDateTime(delivery.deliveredAt ?? delivery.createdAt)}
                </p>
                <div className="flex flex-wrap gap-2">
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
                  <div className="pt-2">
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
                    <p className="mt-1 text-xs text-muted-foreground">
                      {Math.round(delivery.smm.progressPercent)}% completado
                    </p>
                  </div>
                ) : null}
              </div>
              <Button
                size="sm"
                variant="outline"
                render={<Link href={delivery.primaryAction.href} />}
                nativeButton={false}
              >
                {delivery.primaryAction.label}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
