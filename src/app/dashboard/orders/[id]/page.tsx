import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { CustomerDeliveryCard } from "@/components/dashboard/customer-delivery-card";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth/session";
import {
  getCustomerDeliveryForUser,
  getCustomerOrderDeliveries,
} from "@/lib/deliveries/queries";
import { formatDateTime } from "@/lib/format-date";
import { formatMoney } from "@/lib/products/format";
import { orderStatusLabel } from "@/lib/validations/orders";

type PageProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "Detalle del pedido · Nicodigos",
};

export default async function CustomerOrderDetailPage({ params }: PageProps) {
  const session = await getSession();
  if (!session?.user) {
    redirect("/auth/login");
  }

  const { id } = await params;
  const order = await getCustomerOrderDeliveries(id, session.user.id);
  if (!order) {
    notFound();
  }

  const deliveries = await Promise.all(
    order.items
      .filter((item) => item.delivery)
      .map(async (item) => {
        const delivery = await getCustomerDeliveryForUser(
          item.delivery!.id,
          session.user.id,
        );
        return delivery;
      }),
  );

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <Logo size={40} />
        <Button
          variant="outline"
          size="sm"
          render={<Link href="/dashboard/orders" />}
          nativeButton={false}
        >
          Mis pedidos
        </Button>
      </div>

      <div className="space-y-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Pedido {order.id.slice(0, 12)}…
        </h1>
        <p className="text-sm text-muted-foreground">
          {orderStatusLabel[order.status as keyof typeof orderStatusLabel] ??
            order.status}{" "}
          · {formatDateTime(order.createdAt)} ·{" "}
          {formatMoney(order.total, order.currency)}
        </p>
      </div>

      <div className="space-y-4">
        {deliveries.map((delivery) =>
          delivery ? (
            <CustomerDeliveryCard key={delivery.id} delivery={delivery} />
          ) : null,
        )}
        {deliveries.every((d) => !d) ? (
          <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
            Este pedido aún no tiene entregas asociadas.
          </p>
        ) : null}
      </div>
    </div>
  );
}
