import Link from "next/link";
import { HiOutlineShoppingBag } from "react-icons/hi";

import { CustomerOrdersMobileList } from "@/components/dashboard/customer-orders-mobile-list";
import { CustomerOrdersTable } from "@/components/dashboard/customer-orders-table";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { CustomerOrderSummary } from "@/lib/customer-dashboard/types";

export function RecentOrders({
  orders,
  showViewAll = true,
}: {
  orders: CustomerOrderSummary[];
  showViewAll?: boolean;
}) {
  if (orders.length === 0) {
    return (
      <section className="space-y-3">
        <h2 className="font-heading text-lg font-semibold">Pedidos recientes</h2>
        <Empty className="border border-border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HiOutlineShoppingBag className="size-5" />
            </EmptyMedia>
            <EmptyTitle>Sin pedidos recientes</EmptyTitle>
            <EmptyDescription>
              Todavía no tienes pedidos para mostrar aquí.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </section>
    );
  }

  return (
    <section aria-labelledby="recent-orders-heading" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2
          id="recent-orders-heading"
          className="font-heading text-lg font-semibold"
        >
          Pedidos recientes
        </h2>
        {showViewAll ? (
          <Button
            variant="ghost"
            size="sm"
            render={<Link href="/dashboard/pedidos" />}
            nativeButton={false}
          >
            Ver todos mis pedidos
          </Button>
        ) : null}
      </div>

      <div className="hidden md:block">
        <CustomerOrdersTable data={orders} />
      </div>
      <div className="md:hidden">
        <CustomerOrdersMobileList data={orders} />
      </div>
    </section>
  );
}
