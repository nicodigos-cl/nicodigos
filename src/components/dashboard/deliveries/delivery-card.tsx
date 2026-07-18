import Link from "next/link";
import { HiOutlineTruck } from "react-icons/hi";

import { CustomerStatusBadge } from "@/components/dashboard/customer-status-badge";
import { Button } from "@/components/ui/button";
import type { CustomerDeliverySummary } from "@/lib/customer-dashboard/types";
import { formatCustomerDate } from "@/lib/customer-dashboard/format";
import {
  customerDeliveryPath,
  customerOrderPath,
} from "@/lib/customer-dashboard/paths";

export function DeliveryCard({
  delivery,
}: {
  delivery: CustomerDeliverySummary;
}) {
  return (
    <article className="rounded-2xl border border-border bg-card p-4">
      <Link
        href={customerDeliveryPath(delivery.id)}
        className="block space-y-3 transition-colors hover:opacity-90"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="font-medium">{delivery.productName}</p>
            <p className="text-sm text-muted-foreground">
              {delivery.methodLabel} · Pedido #{delivery.orderNumber}
            </p>
            <p className="text-sm text-muted-foreground">
              {formatCustomerDate(delivery.deliveredAt ?? delivery.createdAt)}
            </p>
          </div>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <HiOutlineTruck className="size-4" />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <CustomerStatusBadge
            label={
              delivery.smm?.statusView.label ?? delivery.statusView.label
            }
            tone={delivery.smm?.statusView.tone ?? delivery.statusView.tone}
          />
          {delivery.hasSecretsAvailable ? (
            <CustomerStatusBadge label="Contenido listo" tone="success" />
          ) : null}
        </div>
      </Link>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
        <Button
          size="sm"
          variant="default"
          render={<Link href={delivery.primaryAction.href} />}
          nativeButton={false}
          className="w-full sm:w-auto"
        >
          {delivery.primaryAction.label}
        </Button>
        <Button
          size="sm"
          variant="outline"
          render={<Link href={customerOrderPath(delivery.orderId)} />}
          nativeButton={false}
          className="w-full sm:w-auto"
        >
          Ver pedido
        </Button>
      </div>
    </article>
  );
}
