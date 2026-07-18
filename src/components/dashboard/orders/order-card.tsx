import Image from "next/image";
import Link from "next/link";
import { HiOutlineShoppingBag } from "react-icons/hi";

import { OrderPrimaryActionButton } from "@/components/dashboard/orders/order-primary-action-button";
import { CustomerStatusBadge } from "@/components/dashboard/customer-status-badge";
import type { CustomerOrderSummary } from "@/lib/customer-dashboard/types";
import { formatCustomerDate } from "@/lib/customer-dashboard/format";
import { customerOrderPath } from "@/lib/customer-dashboard/paths";
import { formatMoney } from "@/lib/products/format";

export function OrderCard({ order }: { order: CustomerOrderSummary }) {
  const preview = order.productPreview.slice(0, 3);

  return (
    <article className="rounded-2xl border border-border bg-card p-4">
      <Link
        href={customerOrderPath(order.id)}
        className="block space-y-3 transition-colors hover:opacity-90"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="font-medium">Pedido #{order.number}</p>
            <p className="text-sm text-muted-foreground">
              {formatCustomerDate(order.createdAt)}
            </p>
          </div>
          <p className="shrink-0 font-medium tabular-nums">
            {formatMoney(order.total, order.currency)}
          </p>
        </div>

        {preview.length > 0 ? (
          <ul className="flex gap-2">
            {preview.map((product) => (
              <li
                key={`${order.id}-${product.name}`}
                className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-muted"
              >
                {product.imageUrl ? (
                  <Image
                    src={product.imageUrl}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="40px"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    <HiOutlineShoppingBag className="size-4" />
                  </div>
                )}
              </li>
            ))}
            {order.itemsCount > preview.length ? (
              <li className="flex size-10 items-center justify-center rounded-lg bg-muted text-xs font-medium text-muted-foreground">
                +{order.itemsCount - preview.length}
              </li>
            ) : null}
          </ul>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <CustomerStatusBadge
            label={order.statusView.label}
            tone={order.statusView.tone}
          />
          {order.paymentStatusView ? (
            <CustomerStatusBadge
              label={order.paymentStatusView.label}
              tone={order.paymentStatusView.tone}
            />
          ) : null}
          <CustomerStatusBadge
            label={order.deliverySummary.label}
            tone={order.deliverySummary.tone}
          />
        </div>
      </Link>

      <div className="mt-4 border-t border-border pt-4">
        <OrderPrimaryActionButton
          action={order.primaryAction}
          size="sm"
          className="w-full sm:w-auto"
        />
      </div>
    </article>
  );
}
