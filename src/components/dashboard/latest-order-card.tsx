import { HiOutlineShoppingBag } from "react-icons/hi";

import { CustomerStatusBadge } from "@/components/dashboard/customer-status-badge";
import { OrderPrimaryActionButton } from "@/components/dashboard/orders/order-primary-action-button";
import type { CustomerOrderSummary } from "@/lib/customer-dashboard/types";
import { formatDateTime } from "@/lib/format-date";
import { formatMoney } from "@/lib/products/format";

export function LatestOrderCard({ order }: { order: CustomerOrderSummary }) {
  return (
    <section
      aria-labelledby="latest-order-heading"
      className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:border-primary/20 sm:p-6"
    >
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <HiOutlineShoppingBag className="size-5" />
            </div>
            <div>
              <span className="font-mono text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Pedido más reciente
              </span>
              <h2
                id="latest-order-heading"
                className="font-heading text-lg font-bold tracking-tight text-foreground"
              >
                {order.number}
              </h2>
            </div>
          </div>

          <div className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <span className="block text-xs text-muted-foreground">Fecha</span>
              <span className="font-medium text-foreground">
                {formatDateTime(order.createdAt)}
              </span>
            </div>
            <div>
              <span className="block text-xs text-muted-foreground">Total</span>
              <span className="font-semibold text-foreground tabular-nums">
                {formatMoney(order.total, order.currency)}
              </span>
            </div>
            {order.productNames.length > 0 && (
              <div className="sm:col-span-2 lg:col-span-1">
                <span className="block text-xs text-muted-foreground">Productos</span>
                <span className="block truncate font-medium text-foreground max-w-[280px]">
                  {order.productNames.slice(0, 2).join(", ")}
                  {order.productNames.length > 2 ? ` (+${order.productNames.length - 2})` : ""}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <CustomerStatusBadge
              label={order.statusView.label}
              tone={order.statusView.tone}
            />
            {order.paymentStatusView ? (
              <CustomerStatusBadge
                label={`Pago: ${order.paymentStatusView.label}`}
                tone={order.paymentStatusView.tone}
              />
            ) : null}
            {order.deliveryStatusView ? (
              <CustomerStatusBadge
                label={order.deliveryStatusView.label}
                tone={order.deliveryStatusView.tone}
              />
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0">
          <OrderPrimaryActionButton
            action={order.primaryAction}
            className="w-full md:w-auto font-medium"
          />
        </div>
      </div>
    </section>
  );
}
