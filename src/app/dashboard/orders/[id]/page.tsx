import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { CustomerDeliveryCard } from "@/components/dashboard/customer-delivery-card";
import { CustomerStatusBadge } from "@/components/dashboard/customer-status-badge";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth/session";
import {
  getCustomerDeliveryDetail,
  getCustomerOrderDetail,
} from "@/lib/customer-dashboard/queries";
import { formatDateTime } from "@/lib/format-date";
import { formatMoney } from "@/lib/products/format";

type PageProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "Detalle del pedido",
};

export default async function CustomerOrderDetailPage({ params }: PageProps) {
  const session = await getSession();
  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/dashboard/orders");
  }

  const { id } = await params;
  const order = await getCustomerOrderDetail(id, session.user.id);
  if (!order) {
    notFound();
  }

  const deliveryDetails = await Promise.all(
    order.items
      .filter((item) => item.delivery)
      .map((item) =>
        getCustomerDeliveryDetail(item.delivery!.id, session.user.id),
      ),
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Pedido {order.number}
          </h1>
          <p className="text-sm text-muted-foreground">
            {formatDateTime(order.createdAt)} ·{" "}
            {formatMoney(order.total, order.currency)}
          </p>
          <div className="flex flex-wrap gap-2">
            <CustomerStatusBadge
              label={order.statusView.label}
              tone={order.statusView.tone}
            />
            {order.payment ? (
              <CustomerStatusBadge
                label={`Pago: ${order.payment.statusView.label}`}
                tone={order.payment.statusView.tone}
              />
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            render={<Link href={order.primaryAction.href} />}
            nativeButton={false}
          >
            {order.primaryAction.label}
          </Button>
          <Button
            variant="outline"
            size="sm"
            render={<Link href="/dashboard/orders" />}
            nativeButton={false}
          >
            Volver
          </Button>
          <Button
            variant="outline"
            size="sm"
            render={
              <Link href={`/dashboard/support?orderId=${order.id}`} />
            }
            nativeButton={false}
          >
            Soporte
          </Button>
        </div>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4">
        <h2 className="font-heading text-lg font-bold text-foreground">Productos en este pedido</h2>
        <ul className="divide-y divide-border/60">
          {order.items.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-0.5">
                <p className="font-semibold text-foreground text-sm leading-snug">{item.productName}</p>
                <p className="text-xs text-muted-foreground">
                  {item.methodLabel} · Cantidad {item.quantity}
                </p>
              </div>
              <p className="font-semibold text-sm tabular-nums text-foreground sm:text-base">
                {formatMoney(item.unitPrice, order.currency)}
              </p>
            </li>
          ))}
        </ul>
        <div className="border-t border-border pt-4 text-sm space-y-2">
          <div className="flex justify-between gap-3 text-muted-foreground">
            <span>Subtotal</span>
            <span className="font-medium tabular-nums">
              {formatMoney(order.subtotal, order.currency)}
            </span>
          </div>
          <div className="flex justify-between gap-3 font-semibold text-foreground text-base border-t border-dashed border-border pt-2">
            <span>Total</span>
            <span className="font-bold tabular-nums text-primary">
              {formatMoney(order.total, order.currency)}
            </span>
          </div>
        </div>
      </section>

      {order.payment ? (
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-3">
          <h2 className="font-heading text-lg font-bold text-foreground">Detalles del pago</h2>
          <div className="rounded-xl border border-border/80 bg-muted/20 p-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <span className="block text-xs text-muted-foreground">Método de pago</span>
              <span className="font-semibold text-foreground">{order.payment.methodLabel}</span>
            </div>
            <div>
              <span className="block text-xs text-muted-foreground">Monto</span>
              <span className="font-bold text-foreground tabular-nums">
                {formatMoney(order.payment.amount, order.payment.currency)}
              </span>
            </div>
            {order.payment.paidAt ? (
              <div className="sm:col-span-2 border-t border-border/50 pt-2 mt-1">
                <span className="block text-xs text-muted-foreground">Confirmación de pago</span>
                <span className="font-medium text-foreground">{formatDateTime(order.payment.paidAt)}</span>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4">
        <h2 className="font-heading text-lg font-bold text-foreground">Historial de actividad</h2>
        <div className="relative border-l border-border pl-6 space-y-5 ml-2.5">
          {order.timeline.map((event) => (
            <div key={event.id} className="relative">
              <span className="absolute -left-[31px] top-1 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-border ring-4 ring-background" />
              <p className="text-xs font-semibold text-muted-foreground">
                {formatDateTime(event.createdAt)}
              </p>
              <p className="text-sm font-semibold text-foreground mt-0.5">
                {event.label}
              </p>
              {event.description ? (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {event.description}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-heading text-lg font-semibold">Entregas</h2>
        {deliveryDetails.map((delivery) =>
          delivery ? (
            <div key={delivery.id} className="space-y-2">
              <CustomerDeliveryCard delivery={delivery} />
              <Button
                size="sm"
                variant="outline"
                render={
                  <Link href={`/dashboard/deliveries/${delivery.id}`} />
                }
                nativeButton={false}
              >
                Abrir detalle de entrega
              </Button>
            </div>
          ) : null,
        )}
        {deliveryDetails.every((d) => !d) ? (
          <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
            Este pedido aún no tiene entregas asociadas.
          </p>
        ) : null}
      </section>
    </div>
  );
}
