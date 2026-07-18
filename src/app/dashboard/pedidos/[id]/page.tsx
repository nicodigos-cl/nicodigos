import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { HiOutlineShoppingBag, HiOutlineSupport } from "react-icons/hi";

import { BuyAgain } from "@/components/dashboard/buy-again";
import { CustomerStatusBadge } from "@/components/dashboard/customer-status-badge";
import { OrderPrimaryActionButton } from "@/components/dashboard/orders/order-primary-action-button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress";
import { getSession } from "@/lib/auth/session";
import { formatCustomerDate, formatCustomerOrderNumber } from "@/lib/customer-dashboard/format";
import {
  getCustomerDeliveryDetail,
  getCustomerOrderDetail,
} from "@/lib/customer-dashboard/queries";
import {
  CUSTOMER_ORDERS_PATH,
  customerDeliveryPath,
  customerOrderSupportPath,
} from "@/lib/customer-dashboard/paths";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Pedido #${formatCustomerOrderNumber(id)}`,
  };
}

export default async function CustomerPedidoDetailPage({ params }: PageProps) {
  const session = await getSession();
  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/dashboard/pedidos");
  }

  const { id } = await params;
  const order = await getCustomerOrderDetail(id, session.user.id);
  if (!order) {
    notFound();
  }

  const deliveredDeliveryIds = order.items
    .filter((item) => item.delivery?.status === "DELIVERED")
    .map((item) => item.delivery!.id);

  const deliveryDetails = await Promise.all(
    deliveredDeliveryIds.map((deliveryId) =>
      getCustomerDeliveryDetail(deliveryId, session.user.id),
    ),
  );

  const paymentAction =
    order.payment?.canPay || order.payment?.canRetry
      ? order.primaryAction.type === "PAY" ||
        order.primaryAction.type === "RETRY_PAYMENT"
        ? order.primaryAction
        : order.availableActions.find(
            (action) =>
              action.type === "PAY" || action.type === "RETRY_PAYMENT",
          ) ?? null
      : null;

  return (
    <div className="flex flex-col gap-8">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/dashboard" />}>
              Cuenta
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href={CUSTOMER_ORDERS_PATH} />}>
              Mis pedidos
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Pedido #{order.number}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Pedido #{order.number}
          </h1>
          <p className="text-sm text-muted-foreground">
            {formatCustomerDate(order.createdAt, "long")} ·{" "}
            {order.totalFormatted}
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
            <CustomerStatusBadge
              label={order.deliverySummary.label}
              tone={order.deliverySummary.tone}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <OrderPrimaryActionButton action={order.primaryAction} />
          <Button
            variant="outline"
            size="sm"
            render={
              <Link href={customerOrderSupportPath(order.id)} />
            }
            nativeButton={false}
          >
            <HiOutlineSupport className="size-4" />
            Soporte
          </Button>
        </div>
      </div>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h2 className="font-heading text-lg font-bold text-foreground">
          Resumen del pedido
        </h2>
        <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">Subtotal</dt>
            <dd className="mt-1 font-semibold tabular-nums">
              {order.subtotalFormatted}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Total</dt>
            <dd className="mt-1 font-bold tabular-nums text-primary">
              {order.totalFormatted}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Productos</dt>
            <dd className="mt-1 font-semibold tabular-nums">
              {order.items.length}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Correo</dt>
            <dd className="mt-1 font-medium">{order.email}</dd>
          </div>
          {order.customerName ? (
            <div>
              <dt className="text-xs text-muted-foreground">Cliente</dt>
              <dd className="mt-1 font-medium">{order.customerName}</dd>
            </div>
          ) : null}
          {order.payment ? (
            <div>
              <dt className="text-xs text-muted-foreground">Estado del pago</dt>
              <dd className="mt-1">
                <CustomerStatusBadge
                  label={order.payment.statusView.label}
                  tone={order.payment.statusView.tone}
                />
              </dd>
            </div>
          ) : null}
        </dl>
      </section>

      {order.payment ? (
        <section className="space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h2 className="font-heading text-lg font-bold text-foreground">
            Pago
          </h2>
          <dl className="grid gap-4 rounded-xl border border-border/80 bg-muted/20 p-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Estado</dt>
              <dd className="mt-1">
                <CustomerStatusBadge
                  label={order.payment.statusView.label}
                  tone={order.payment.statusView.tone}
                />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Monto</dt>
              <dd className="mt-1 font-bold tabular-nums">
                {order.payment.amountFormatted}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Método</dt>
              <dd className="mt-1 font-semibold">
                {order.payment.methodLabel}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">
                Última actualización
              </dt>
              <dd className="mt-1 font-medium">
                {formatCustomerDate(order.payment.updatedAt, "long")}
              </dd>
            </div>
            {order.payment.paidAt ? (
              <div className="sm:col-span-2">
                <dt className="text-xs text-muted-foreground">
                  Pago confirmado
                </dt>
                <dd className="mt-1 font-medium">
                  {formatCustomerDate(order.payment.paidAt, "long")}
                </dd>
              </div>
            ) : null}
          </dl>

          {order.payment.canPay ? (
            <p className="text-sm text-muted-foreground">
              Tu pago está pendiente. Completa el pago para que podamos
              procesar tu pedido.
            </p>
          ) : null}

          {order.payment.canRetry ? (
            <p className="text-sm text-muted-foreground">
              El pago no se completó. Puedes reintentarlo cuando quieras.
            </p>
          ) : null}

          {paymentAction ? (
            <OrderPrimaryActionButton action={paymentAction} size="sm" />
          ) : null}
        </section>
      ) : null}

      <section className="space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h2 className="font-heading text-lg font-bold text-foreground">
          Productos
        </h2>
        <ul className="divide-y divide-border/60">
          {order.items.map((item) => (
            <li key={item.id} className="space-y-4 py-5 first:pt-0 last:pb-0">
              <div className="flex gap-4">
                <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      <HiOutlineShoppingBag className="size-6" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold text-foreground">
                        {item.productName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.methodLabel} · Cantidad {item.quantity}
                      </p>
                    </div>
                    <p className="font-semibold tabular-nums">
                      {item.lineTotalFormatted}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {item.delivery ? (
                      <CustomerStatusBadge
                        label={item.delivery.statusView.label}
                        tone={item.delivery.statusView.tone}
                      />
                    ) : (
                      <CustomerStatusBadge
                        label="Sin entrega"
                        tone="neutral"
                      />
                    )}
                    {item.smm?.statusView ? (
                      <CustomerStatusBadge
                        label={item.smm.statusView.label}
                        tone={item.smm.statusView.tone}
                      />
                    ) : null}
                  </div>

                  {item.smm?.progressPercent != null ? (
                    <Progress value={item.smm.progressPercent} className="max-w-md">
                      <ProgressLabel>Progreso del servicio</ProgressLabel>
                      <ProgressValue>
                        {(_formatted, value) =>
                          value != null ? `${Math.round(value)}%` : "—"
                        }
                      </ProgressValue>
                    </Progress>
                  ) : null}

                  {item.keysPreview.length > 0 && item.delivery ? (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">
                        Keys ({item.keysCount})
                      </p>
                      <ul className="space-y-1">
                        {item.keysPreview.map((key) => (
                          <li key={key.id}>
                            <code className="rounded-md bg-muted px-2 py-1 font-mono text-xs">
                              {key.masked}
                            </code>
                          </li>
                        ))}
                      </ul>
                      <Button
                        size="sm"
                        variant="outline"
                        render={
                          <Link
                            href={customerDeliveryPath(item.delivery.id)}
                          />
                        }
                        nativeButton={false}
                      >
                        Ver entrega completa
                      </Button>
                    </div>
                  ) : null}

                  {item.deliveryErrorMessage ? (
                    <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                      {item.deliveryErrorMessage}
                    </p>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h2 className="font-heading text-lg font-bold text-foreground">
          Historial
        </h2>
        <div className="relative ml-2.5 space-y-5 border-l border-border pl-6">
          {order.timeline.map((event) => (
            <div key={event.id} className="relative">
              <span className="absolute -left-[31px] top-1 flex size-2.5 items-center justify-center rounded-full bg-border ring-4 ring-background" />
              <p className="text-xs font-semibold text-muted-foreground">
                {formatCustomerDate(event.occurredAt, "long")}
              </p>
              <p className="mt-0.5 text-sm font-semibold text-foreground">
                {event.label}
              </p>
              {event.description ? (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {event.description}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      {deliveryDetails.some(Boolean) ? (
        <section className="space-y-3">
          <h2 className="font-heading text-lg font-semibold">
            Entregas disponibles
          </h2>
          <ul className="flex flex-col gap-2">
            {deliveryDetails.map(
              (delivery) =>
                delivery ? (
                  <li key={delivery.id}>
                    <Button
                      size="sm"
                      variant="outline"
                      render={
                        <Link href={customerDeliveryPath(delivery.id)} />
                      }
                      nativeButton={false}
                    >
                      Ver entrega: {delivery.productName}
                    </Button>
                  </li>
                ) : null,
            )}
          </ul>
        </section>
      ) : null}

      <section className="space-y-3 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h2 className="font-heading text-lg font-semibold">¿Necesitas ayuda?</h2>
        <p className="text-sm text-muted-foreground">
          Si tienes dudas sobre este pedido, nuestro equipo puede ayudarte.
        </p>
        <Button
          variant="outline"
          render={
            <Link href={customerOrderSupportPath(order.id, "other")} />
          }
          nativeButton={false}
        >
          Contactar soporte
        </Button>
      </section>

      {order.buyAgainProducts.length > 0 ? (
        <BuyAgain products={order.buyAgainProducts} />
      ) : null}
    </div>
  );
}
