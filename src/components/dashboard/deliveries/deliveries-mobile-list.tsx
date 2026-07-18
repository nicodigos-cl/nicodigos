import { HiOutlineTruck } from "react-icons/hi";

import { DeliveryCard } from "@/components/dashboard/deliveries/delivery-card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { CustomerDeliverySummary } from "@/lib/customer-dashboard/types";

export function DeliveriesMobileList({
  data,
}: {
  data: CustomerDeliverySummary[];
}) {
  if (data.length === 0) {
    return (
      <Empty className="border border-border bg-card">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HiOutlineTruck className="size-5" />
          </EmptyMedia>
          <EmptyTitle>Sin entregas</EmptyTitle>
          <EmptyDescription>
            No hay entregas para mostrar con los filtros actuales.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {data.map((delivery) => (
        <li key={delivery.id}>
          <DeliveryCard delivery={delivery} />
        </li>
      ))}
    </ul>
  );
}
