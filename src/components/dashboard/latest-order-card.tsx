import Link from "next/link";

import { CustomerStatusBadge } from "@/components/dashboard/customer-status-badge";
import { Button } from "@/components/ui/button";
import type { CustomerOrderSummary } from "@/lib/customer-dashboard/types";
import { formatDateTime } from "@/lib/format-date";
import { formatMoney } from "@/lib/products/format";

export function LatestOrderCard({ order }: { order: CustomerOrderSummary }) {
  return (
    <section
      aria-labelledby="latest-order-heading"
      className="rounded-2xl border border-border bg-card p-4 sm:p-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h2
            id="latest-order-heading"
            className="font-heading text-lg font-semibold"
          >
            Pedido más reciente
          </h2>
          <p className="font-medium">{order.number}</p>
          <p className="text-sm text-muted-foreground">
            {formatDateTime(order.createdAt)} ·{" "}
            {formatMoney(order.total, order.currency)}
          </p>
          <div className="flex flex-wrap gap-2">
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
          {order.productNames.length > 0 ? (
            <p className="text-sm text-muted-foreground">
              {order.productNames.slice(0, 3).join(" · ")}
              {order.productNames.length > 3
                ? ` · +${order.productNames.length - 3}`
                : null}
            </p>
          ) : null}
        </div>
        <Button
          render={<Link href={order.primaryAction.href} />}
          nativeButton={false}
        >
          {order.primaryAction.label}
        </Button>
      </div>
    </section>
  );
}
