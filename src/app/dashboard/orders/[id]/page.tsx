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

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
        <h2 className="font-heading text-lg font-semibold">Productos</h2>
        <ul className="mt-4 space-y-3">
          {order.items.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-1 border-b border-border pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium">{item.productName}</p>
                <p className="text-sm text-muted-foreground">
                  {item.methodLabel} · Cantidad {item.quantity}
                </p>
              </div>
              <p className="tabular-nums">
                {formatMoney(item.unitPrice, order.currency)}
              </p>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1 border-t border-border pt-4 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="tabular-nums">
              {formatMoney(order.subtotal, order.currency)}
            </dd>
          </div>
          <div className="flex justify-between gap-3 font-medium">
            <dt>Total</dt>
            <dd className="tabular-nums">
              {formatMoney(order.total, order.currency)}
            </dd>
          </div>
        </dl>
      </section>

      {order.payment ? (
        <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
          <h2 className="font-heading text-lg font-semibold">Pago</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {order.payment.methodLabel} ·{" "}
            {formatMoney(order.payment.amount, order.payment.currency)}
            {order.payment.paidAt
              ? ` · Confirmado ${formatDateTime(order.payment.paidAt)}`
              : null}
          </p>
        </section>
      ) : null}

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
        <h2 className="font-heading text-lg font-semibold">Actividad</h2>
        <ol className="mt-4 space-y-3 border-l border-border pl-4">
          {order.timeline.map((event) => (
            <li key={event.id} className="text-sm">
              <p className="font-medium">{event.label}</p>
              <p className="text-muted-foreground">
                {formatDateTime(event.createdAt)}
                {event.description ? ` · ${event.description}` : null}
              </p>
            </li>
          ))}
        </ol>
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
