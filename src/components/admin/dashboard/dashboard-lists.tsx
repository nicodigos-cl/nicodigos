import Link from "next/link";
import {
  HiOutlineClipboardList,
  HiOutlineCreditCard,
  HiOutlineCube,
  HiOutlineShoppingBag,
  HiOutlineTruck,
} from "react-icons/hi";

import { DashboardEmpty } from "@/components/admin/dashboard/dashboard-empty";
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
      <section className="rounded-sm border border-border/80 bg-muted/5 p-4 sm:p-5 font-mono text-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 p-1 text-[8px] text-muted-foreground/30 select-none">
          [LOG_ORDERS]
        </div>
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">Pedidos recientes</h2>
          <Button
            size="sm"
            variant="outline"
            render={<Link href="/admin/orders" />}
            nativeButton={false}
            className="rounded-sm font-mono text-xs border border-border/65 hover:bg-muted/50"
          >
            VER_TODOS
          </Button>
        </div>
        {data.recentOrders.length === 0 ? (
          <DashboardEmpty
            icon={HiOutlineShoppingBag}
            title="Sin pedidos"
            description="Los pedidos recientes aparecerán aquí cuando haya actividad."
          />
        ) : (
          <ul className="space-y-2">
            {data.recentOrders.map((order) => (
              <li
                key={order.id}
                className="rounded-sm border border-border/60 bg-background/50 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="font-bold text-foreground hover:text-primary transition-colors"
                  >
                    #{order.orderNumber}
                  </Link>
                  <OrderStatusBadge status={order.status as OrderStatus} className="rounded-sm" />
                </div>
                <p className="mt-1 truncate text-muted-foreground">
                  {order.customerName || order.email}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                  <span className="tabular-nums font-semibold text-foreground">
                    {formatMoney(order.total, order.currency)}
                  </span>
                  <span>·</span>
                  {order.paymentStatus ? (
                    <TransactionStatusBadge
                      status={order.paymentStatus as PaymentStatus}
                      className="rounded-sm"
                    />
                  ) : null}
                  <span>·</span>
                  <span>{formatDateTime(order.createdAt)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-sm border border-border/80 bg-muted/5 p-4 sm:p-5 font-mono text-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 p-1 text-[8px] text-muted-foreground/30 select-none">
          [LOG_TX]
        </div>
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Transacciones recientes
          </h2>
          <Button
            size="sm"
            variant="outline"
            render={<Link href="/admin/transactions" />}
            nativeButton={false}
            className="rounded-sm font-mono text-xs border border-border/65 hover:bg-muted/50"
          >
            VER_TODAS
          </Button>
        </div>
        {data.recentTransactions.length === 0 ? (
          <DashboardEmpty
            icon={HiOutlineCreditCard}
            title="Sin transacciones"
            description="Las transacciones aparecerán cuando se inicie un checkout."
          />
        ) : (
          <ul className="space-y-2">
            {data.recentTransactions.map((tx) => (
              <li
                key={tx.id}
                className="rounded-sm border border-border/60 bg-background/50 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    href={`/admin/transactions/${tx.id}`}
                    className="font-mono text-xs text-foreground hover:text-primary transition-colors"
                  >
                    ID: {tx.id.slice(0, 12)}…
                  </Link>
                  <div className="flex items-center gap-2">
                    {tx.requiresReview ? (
                      <Badge variant="destructive" className="rounded-sm font-mono text-[9px] tracking-wider uppercase h-auto">Revisión</Badge>
                    ) : null}
                    <TransactionStatusBadge
                      status={tx.status as PaymentStatus}
                      className="rounded-sm"
                    />
                  </div>
                </div>
                <p className="mt-1 text-muted-foreground">
                  Pedido #{tx.orderNumber} · {tx.provider}
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  <span className="font-semibold text-foreground">{formatMoney(tx.amount, tx.currency)}</span> ·{" "}
                  {formatDateTime(tx.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-sm border border-border/80 bg-muted/5 p-4 sm:p-5 font-mono text-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 p-1 text-[8px] text-muted-foreground/30 select-none">
          [LOG_DELIV]
        </div>
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Entregas pendientes
          </h2>
          <Button
            size="sm"
            variant="outline"
            render={<Link href="/admin/deliveries?status=PENDING" />}
            nativeButton={false}
            className="rounded-sm font-mono text-xs border border-border/65 hover:bg-muted/50"
          >
            VER_TODAS
          </Button>
        </div>
        {data.pendingDeliveries.length === 0 ? (
          <DashboardEmpty
            icon={HiOutlineTruck}
            title="Cola vacía"
            description="No hay entregas pendientes o fallidas en cola."
          />
        ) : (
          <ul className="space-y-2">
            {data.pendingDeliveries.map((delivery) => (
              <li
                key={delivery.id}
                className="rounded-sm border border-border/60 bg-background/50 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    href={`/admin/deliveries/${delivery.id}`}
                    className="font-bold text-foreground hover:text-primary transition-colors truncate max-w-[70%]"
                  >
                    {delivery.productName}
                  </Link>
                  <DeliveryStatusBadge
                    status={delivery.status as DeliveryStatus}
                    className="rounded-sm"
                  />
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  ORD: #{delivery.orderNumber} · MÉT: {delivery.method} ·{" "}
                  AGE: {delivery.ageHours}h · CL: {delivery.customerEmail}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-sm border border-border/80 bg-muted/5 p-4 sm:p-5 font-mono text-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 p-1 text-[8px] text-muted-foreground/30 select-none">
          [LOG_TOP_PRODUCTS]
        </div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-foreground mb-4">
          Productos más vendidos
        </h2>
        {data.topProducts.length === 0 ? (
          <DashboardEmpty
            icon={HiOutlineCube}
            title="Sin ventas"
            description="Sin ventas confirmadas en este ciclo."
          />
        ) : (
          <ul className="space-y-1">
            {data.topProducts.map((product) => (
              <li
                key={product.productId}
                className="flex items-center justify-between py-2 border-b border-dashed border-border/40 last:border-0"
              >
                <div className="min-w-0 pr-2">
                  <Link
                    href={product.href}
                    className="font-bold text-foreground hover:text-primary transition-colors"
                  >
                    {product.name}
                  </Link>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    MÉT: {product.deliveryMethod} · UDS: {product.quantitySold}
                    {product.availableKeys != null
                      ? ` · KEYS_STOCK: ${product.availableKeys}`
                      : ""}
                  </p>
                </div>
                <span className="shrink-0 tabular-nums font-bold text-primary">
                  {formatMoney(product.revenue, product.currency)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-sm border border-border/80 bg-muted/5 p-4 sm:p-5 font-mono text-xs xl:col-span-2 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-1 text-[8px] text-muted-foreground/30 select-none">
          [LOG_ACTIVITY]
        </div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-foreground mb-4">
          Actividad reciente
        </h2>
        {data.activity.length === 0 ? (
          <DashboardEmpty
            icon={HiOutlineClipboardList}
            title="Sin actividad"
            description="Sin actividad registrada en la sesión."
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {data.activity.map((event) => (
              <li
                key={event.id}
                className="rounded-sm border border-border/60 bg-background/50 p-3"
              >
                <p className="font-bold text-foreground uppercase tracking-wide">{event.title}</p>
                <p className="text-muted-foreground mt-0.5">{event.description}</p>
                <p className="mt-2 text-[10px] text-muted-foreground">
                  <time dateTime={event.createdAt} title={formatDateTime(event.createdAt)}>
                    {formatDateTime(event.createdAt)}
                  </time>
                  {event.href ? (
                    <>
                      {" · "}
                      <Link
                        href={event.href}
                        className="text-primary hover:underline font-bold"
                      >
                        [ABRIR_REGISTRO]
                      </Link>
                    </>
                  ) : null}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-sm border border-border/80 bg-muted/5 p-4 sm:p-5 font-mono text-xs xl:col-span-2 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-1 text-[8px] text-muted-foreground/30 select-none">
          [QUICK_ACTIONS]
        </div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-foreground mb-4">
          Acciones rápidas
        </h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {data.quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="rounded-sm border border-border/60 bg-background/30 px-3 py-3 hover:bg-background/60 hover:border-primary transition-all group"
            >
              <p className="text-xs font-bold uppercase text-foreground group-hover:text-primary transition-colors">
                &gt; {action.label}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                {action.description}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
