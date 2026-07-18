"use client";

import { useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  HiOutlineArrowLeft,
  HiOutlineClipboardCopy,
  HiOutlineExternalLink,
  HiOutlineLink,
} from "react-icons/hi";
import { toast } from "sonner";

import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/components/admin/orders/order-status-badge";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";
import {
  createPaymentLinkAction,
  updateOrderStatusAction,
} from "@/lib/actions/orders";
import { formatDateTime } from "@/lib/format-date";
import { formatMoney } from "@/lib/products/format";
import {
  deliveryMethodLabel,
  orderStatusLabel,
  type OrderStatus,
} from "@/lib/validations/orders";
import type { OrderDetailDto } from "@/types/orders";

const statuses = Object.keys(orderStatusLabel) as OrderStatus[];

export function OrderDetailView({ order }: { order: OrderDetailDto }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function copyCheckout() {
    void navigator.clipboard.writeText(order.checkoutUrl);
    toast.success("Link de checkout copiado");
  }

  function createLink() {
    startTransition(async () => {
      const result = await createPaymentLinkAction({ orderId: order.id });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      void navigator.clipboard.writeText(result.data.checkoutUrl);
      toast.success("Link Flow generado y checkout copiado");
      router.refresh();
    });
  }

  function changeStatus(status: OrderStatus) {
    startTransition(async () => {
      const result = await updateOrderStatusAction({ id: order.id, status });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Estado actualizado");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            render={<Link href="/admin/orders" />}
            nativeButton={false}
          >
            <HiOutlineArrowLeft className="size-4" />
          </Button>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-2xl font-semibold tracking-tight">
                Orden
              </h1>
              <OrderStatusBadge status={order.status} />
            </div>
            <p className="font-mono text-xs text-muted-foreground">{order.id}</p>
            <p className="text-sm text-muted-foreground">
              {order.customerName || order.userName} · {order.email}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={copyCheckout}>
            <HiOutlineClipboardCopy className="size-4" />
            Copiar /checkout
          </Button>
          <Button
            type="button"
            variant="outline"
            render={<Link href={order.checkoutUrl} target="_blank" />}
            nativeButton={false}
          >
            <HiOutlineExternalLink className="size-4" />
            Abrir checkout
          </Button>
          {order.status === "PENDING" ? (
            <Button type="button" disabled={pending} onClick={createLink}>
              <HiOutlineLink className="size-4" />
              Generar pago Flow
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
          <h2 className="text-sm font-medium">Ítems</h2>
          <ul className="mt-4 divide-y divide-border">
            {order.items.map((item) => (
              <li key={item.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                {item.coverImageUrl ? (
                  <Image
                    src={item.coverImageUrl}
                    alt=""
                    width={72}
                    height={72}
                    unoptimized
                    className="size-18 rounded-xl object-cover"
                  />
                ) : (
                  <div className="size-18 rounded-xl bg-muted" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{item.productName}</p>
                  <p className="text-sm text-muted-foreground">
                    {deliveryMethodLabel[item.deliveryMethod]} · Cant.{" "}
                    {item.quantity}
                  </p>
                  <p className="mt-1 text-sm tabular-nums">
                    {formatMoney(item.unitPrice, order.currency)} c/u
                  </p>
                </div>
                <p className="font-medium tabular-nums">
                  {formatMoney(item.lineTotal, order.currency)}
                </p>
              </li>
            ))}
          </ul>
          <Separator className="my-4" />
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="tabular-nums">
                {formatMoney(order.subtotal, order.currency)}
              </dd>
            </div>
            <div className="flex justify-between text-base font-semibold">
              <dt>Total</dt>
              <dd className="tabular-nums">
                {formatMoney(order.total, order.currency)}
              </dd>
            </div>
          </dl>
        </section>

        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
            <h2 className="text-sm font-medium">Estado</h2>
            <div className="mt-3">
              <NativeSelect
                className="w-full"
                value={order.status}
                disabled={pending}
                onChange={(event) =>
                  changeStatus(event.target.value as OrderStatus)
                }
              >
                {statuses.map((status) => (
                  <NativeSelectOption key={status} value={status}>
                    {orderStatusLabel[status]}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Creada {formatDateTime(order.createdAt)}
            </p>
          </section>

          <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
            <h2 className="text-sm font-medium">Pagos</h2>
            {order.payments.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Sin pagos registrados.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {order.payments.map((payment) => (
                  <li
                    key={payment.id}
                    className="rounded-xl border border-border p-3 text-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <PaymentStatusBadge status={payment.status} />
                      <span className="tabular-nums">
                        {formatMoney(payment.amount, payment.currency)}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {payment.provider} · {formatDateTime(payment.createdAt)}
                    </p>
                    {payment.externalId ? (
                      <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                        {payment.externalId}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
            <h2 className="text-sm font-medium">Link de pago</h2>
            <p className="mt-2 break-all text-sm text-muted-foreground">
              {order.checkoutUrl}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Comparte este link. El cliente confirma en /checkout y paga en el
              portal de Flow.cl.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
