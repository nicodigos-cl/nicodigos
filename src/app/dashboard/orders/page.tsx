import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth/session";
import { getCustomerOrdersPage } from "@/lib/deliveries/queries";
import { formatDateTime } from "@/lib/format-date";
import { formatMoney } from "@/lib/products/format";
import { orderStatusLabel } from "@/lib/validations/orders";

export const metadata: Metadata = {
  title: "Mis pedidos · Nicodigos",
};

export default async function CustomerOrdersPage() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/auth/login");
  }

  const orders = await getCustomerOrdersPage(session.user.id);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <Logo size={40} />
        <Button
          variant="outline"
          size="sm"
          render={<Link href="/dashboard" />}
          nativeButton={false}
        >
          Cuenta
        </Button>
      </div>

      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Mis pedidos
        </h1>
        <p className="text-sm text-muted-foreground">
          Revisa el estado y el contenido entregado de tus compras.
        </p>
      </div>

      {orders.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Todavía no tienes pedidos.
        </p>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/dashboard/orders/${order.id}`}
                className="block rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-muted/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      Pedido {order.id.slice(0, 10)}…
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(order.createdAt)} · {order.itemsCount}{" "}
                      ítem(s)
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium tabular-nums">
                      {formatMoney(order.total, order.currency)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {orderStatusLabel[order.status as keyof typeof orderStatusLabel] ??
                        order.status}
                    </p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
