import Link from "next/link";

import { OrderStatusBadge } from "@/components/admin/orders/order-status-badge";
import { DeliveryStatusBadge } from "@/components/admin/deliveries/delivery-status-badge";
import { TransactionStatusBadge } from "@/components/admin/transactions/transaction-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format-date";
import { formatMoney } from "@/lib/products/format";
import type { OrderStatus, PaymentStatus } from "@/lib/validations/orders";
import type { DeliveryStatus } from "@/generated/prisma/enums";
import type { AdminDashboardDto } from "@/types/dashboard";

export function DashboardLists({ data }: { data: AdminDashboardDto }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="font-heading text-lg font-semibold">Pedidos recientes</h2>
          <Button
            size="sm"
            variant="outline"
            render={<Link href="/admin/orders" />}
            nativeButton={false}
          >
            Ver todos
          </Button>
        </div>
        {data.recentOrders.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin pedidos todavía.</p>
        ) : (
          <ul className="space-y-3">
            {data.recentOrders.map((order) => (
              <li
                key={order.id}
                className="rounded-xl border border-border/70 p-3 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="font-medium hover:underline"
                  >
                    #{order.orderNumber}
                  </Link>
                  <OrderStatusBadge status={order.status as OrderStatus} />
                </div>
                <p className="mt-1 truncate text-muted-foreground">
                  {order.customerName || order.email}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="tabular-nums">
                    {formatMoney(order.total, order.currency)}
                  </span>
                  {order.paymentStatus ? (
                    <TransactionStatusBadge
                      status={order.paymentStatus as PaymentStatus}
                    />
                  ) : null}
                  <span>{formatDateTime(order.createdAt)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="font-heading text-lg font-semibold">
            Transacciones recientes
          </h2>
          <Button
            size="sm"
            variant="outline"
            render={<Link href="/admin/transactions" />}
            nativeButton={false}
          >
            Ver todas
          </Button>
        </div>
        {data.recentTransactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin transacciones.</p>
        ) : (
          <ul className="space-y-3">
            {data.recentTransactions.map((tx) => (
              <li
                key={tx.id}
                className="rounded-xl border border-border/70 p-3 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    href={`/admin/transactions/${tx.id}`}
                    className="font-mono text-xs hover:underline"
                  >
                    {tx.id.slice(0, 12)}…
                  </Link>
                  <div className="flex items-center gap-2">
                    {tx.requiresReview ? (
                      <Badge variant="destructive">Revisión</Badge>
                    ) : null}
                    <TransactionStatusBadge
                      status={tx.status as PaymentStatus}
                    />
                  </div>
                </div>
                <p className="mt-1 text-muted-foreground">
                  Pedido #{tx.orderNumber} · {tx.provider}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatMoney(tx.amount, tx.currency)} ·{" "}
                  {formatDateTime(tx.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="font-heading text-lg font-semibold">
            Entregas pendientes
          </h2>
          <Button
            size="sm"
            variant="outline"
            render={<Link href="/admin/deliveries?status=PENDING" />}
            nativeButton={false}
          >
            Ver todas
          </Button>
        </div>
        {data.pendingDeliveries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay entregas pendientes o fallidas.
          </p>
        ) : (
          <ul className="space-y-3">
            {data.pendingDeliveries.map((delivery) => (
              <li
                key={delivery.id}
                className="rounded-xl border border-border/70 p-3 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    href={`/admin/deliveries/${delivery.id}`}
                    className="font-medium hover:underline"
                  >
                    {delivery.productName}
                  </Link>
                  <DeliveryStatusBadge
                    status={delivery.status as DeliveryStatus}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  #{delivery.orderNumber} · {delivery.method} ·{" "}
                  {delivery.ageHours}h · {delivery.customerEmail}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
        <h2 className="mb-4 font-heading text-lg font-semibold">
          Productos más vendidos
        </h2>
        {data.topProducts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sin ventas confirmadas en el periodo.
          </p>
        ) : (
          <ul className="space-y-3">
            {data.topProducts.map((product) => (
              <li
                key={product.productId}
                className="flex items-start justify-between gap-3 text-sm"
              >
                <div className="min-w-0">
                  <Link
                    href={product.href}
                    className="font-medium hover:underline"
                  >
                    {product.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {product.deliveryMethod} · {product.quantitySold} uds
                    {product.availableKeys != null
                      ? ` · ${product.availableKeys} keys`
                      : ""}
                  </p>
                </div>
                <span className="shrink-0 tabular-nums">
                  {formatMoney(product.revenue, product.currency)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-6 xl:col-span-2">
        <h2 className="mb-4 font-heading text-lg font-semibold">
          Actividad reciente
        </h2>
        {data.activity.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin actividad reciente.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {data.activity.map((event) => (
              <li
                key={event.id}
                className="rounded-xl border border-border/70 p-3 text-sm"
              >
                <p className="font-medium">{event.title}</p>
                <p className="text-muted-foreground">{event.description}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  <time dateTime={event.createdAt} title={formatDateTime(event.createdAt)}>
                    {formatDateTime(event.createdAt)}
                  </time>
                  {event.href ? (
                    <>
                      {" · "}
                      <Link
                        href={event.href}
                        className="text-primary hover:underline"
                      >
                        Abrir
                      </Link>
                    </>
                  ) : null}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-6 xl:col-span-2">
        <h2 className="mb-4 font-heading text-lg font-semibold">
          Acciones rápidas
        </h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {data.quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="rounded-xl border border-border px-3 py-3 hover:bg-muted/40"
            >
              <p className="text-sm font-medium">{action.label}</p>
              <p className="text-xs text-muted-foreground">
                {action.description}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
