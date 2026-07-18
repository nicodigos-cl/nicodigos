import { HiOutlineShoppingBag } from "react-icons/hi";

import { OrderCard } from "@/components/dashboard/orders/order-card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { CustomerOrderSummary } from "@/lib/customer-dashboard/types";

export function OrdersMobileList({ data }: { data: CustomerOrderSummary[] }) {
  if (data.length === 0) {
    return (
      <Empty className="border border-border bg-card">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HiOutlineShoppingBag className="size-5" />
          </EmptyMedia>
          <EmptyTitle>Sin pedidos</EmptyTitle>
          <EmptyDescription>
            No hay pedidos para mostrar con los filtros actuales.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {data.map((order) => (
        <li key={order.id}>
          <OrderCard order={order} />
        </li>
      ))}
    </ul>
  );
}
