import Link from "next/link";
import { HiOutlineArrowLeft } from "react-icons/hi";

import { DeliveryActionMenu } from "@/components/admin/deliveries/delivery-action-menu";
import { DeliveryEventsTimeline } from "@/components/admin/deliveries/delivery-events-timeline";
import { DeliveryKinguinPanel } from "@/components/admin/deliveries/delivery-kinguin-panel";
import { DeliveryManualForm } from "@/components/admin/deliveries/delivery-manual-form";
import { DeliverySmmPanel } from "@/components/admin/deliveries/delivery-smm-panel";
import { DeliveryStatusBadge } from "@/components/admin/deliveries/delivery-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format-date";
import { formatMoney } from "@/lib/products/format";
import { deliveryMethodLabel } from "@/lib/validations/deliveries";
import type {
  AvailableProductKeyDto,
  DeliveryDetailDto,
} from "@/types/deliveries";

export function DeliveryDetailView({
  delivery,
  availableKeys,
}: {
  delivery: DeliveryDetailDto;
  availableKeys: AvailableProductKeyDto[];
}) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            render={<Link href="/admin/deliveries" />}
            nativeButton={false}
            aria-label="Volver a entregas"
          >
            <HiOutlineArrowLeft className="size-4" />
          </Button>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-2xl font-semibold tracking-tight">
                {delivery.product.name}
              </h1>
              <DeliveryStatusBadge status={delivery.status} />
              <Badge variant="secondary">
                {deliveryMethodLabel[delivery.deliveryMethod]}
              </Badge>
            </div>
            <p className="font-mono text-xs text-muted-foreground">
              {delivery.id}
            </p>
            <p className="text-sm text-muted-foreground">
              Pedido {delivery.order.id.slice(0, 12)}… · Creada{" "}
              {formatDateTime(delivery.createdAt)}
              {delivery.deliveredAt
                ? ` · Entregada ${formatDateTime(delivery.deliveredAt)}`
                : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`/admin/orders/${delivery.order.id}`} />}
            nativeButton={false}
          >
            Abrir pedido
          </Button>
          <DeliveryActionMenu delivery={delivery} />
        </div>
      </div>

      {delivery.errorMessage ? (
        <div
          role="alert"
          className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {delivery.errorMessage}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
            <h2 className="text-sm font-medium">
              {delivery.deliveryMethod === "MANUAL"
                ? "Entrega manual"
                : delivery.deliveryMethod === "SMM"
                  ? "Panel SMM"
                  : "Kinguin"}
            </h2>
            <div className="mt-4">
              {delivery.deliveryMethod === "MANUAL" ? (
                <DeliveryManualForm
                  delivery={delivery}
                  availableKeys={availableKeys}
                />
              ) : null}
              {delivery.deliveryMethod === "SMM" && delivery.smm ? (
                <DeliverySmmPanel smm={delivery.smm} />
              ) : null}
              {delivery.deliveryMethod === "KINGUIN" && delivery.kinguin ? (
                <DeliveryKinguinPanel
                  deliveryId={delivery.id}
                  kinguin={delivery.kinguin}
                />
              ) : null}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
            <h2 className="mb-4 text-sm font-medium">Timeline</h2>
            <DeliveryEventsTimeline events={delivery.events} />
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
            <h2 className="text-sm font-medium">Cliente</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Nombre</dt>
                <dd>{delivery.order.customerName || delivery.order.userName}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Email</dt>
                <dd className="break-all">{delivery.order.email}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Usuario</dt>
                <dd className="font-mono text-xs">{delivery.order.userId.slice(0, 12)}…</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Pedido</dt>
                <dd>
                  <Link
                    href={`/admin/orders/${delivery.order.id}`}
                    className="text-primary hover:underline"
                  >
                    {delivery.order.id.slice(0, 12)}…
                  </Link>
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Total</dt>
                <dd className="tabular-nums">
                  {formatMoney(delivery.order.total, delivery.order.currency)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Pagado</dt>
                <dd>{delivery.order.isPaid ? "Sí" : "No"}</dd>
              </div>
            </dl>
            <Button
              className="mt-4 w-full"
              variant="outline"
              size="sm"
              render={<Link href={`/admin/users/${delivery.order.userId}`} />}
              nativeButton={false}
            >
              Ver usuario
            </Button>
          </section>

          <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
            <h2 className="text-sm font-medium">Producto</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Nombre</dt>
                <dd className="text-right">{delivery.product.name}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Cantidad</dt>
                <dd>{delivery.product.quantity}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Precio unitario</dt>
                <dd className="tabular-nums">
                  {formatMoney(
                    delivery.product.unitPrice,
                    delivery.order.currency,
                  )}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Método</dt>
                <dd>
                  {deliveryMethodLabel[delivery.product.deliveryMethod]}
                </dd>
              </div>
            </dl>
            <Button
              className="mt-4 w-full"
              variant="outline"
              size="sm"
              render={
                <Link href={`/admin/products/${delivery.product.id}`} />
              }
              nativeButton={false}
            >
              Revisar producto
            </Button>
          </section>

          {delivery.notifications.length > 0 ? (
            <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
              <h2 className="text-sm font-medium">Emails</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {delivery.notifications.map((n) => (
                  <li key={n.id} className="rounded-xl bg-muted/50 px-3 py-2">
                    <p className="font-medium">
                      {n.type} · {n.status}
                      {n.isResend ? " · reenvío" : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {n.recipient} · {formatDateTime(n.createdAt)}
                    </p>
                    {n.errorMessage ? (
                      <p className="text-xs text-destructive">{n.errorMessage}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
