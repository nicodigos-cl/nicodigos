"use client";

import Link from "next/link";
import { HiOutlineTruck } from "react-icons/hi";

import { DeliveryStatusBadge } from "@/components/admin/deliveries/delivery-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { formatDateTime } from "@/lib/format-date";
import { deliveryMethodLabel } from "@/lib/validations/deliveries";
import type { DeliveryListItemDto } from "@/types/deliveries";

export function DeliveriesMobileList({
  data,
}: {
  data: DeliveryListItemDto[];
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
        <li
          key={delivery.id}
          className="rounded-2xl border border-border bg-card p-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-medium">{delivery.productName}</p>
              <p className="truncate text-xs text-muted-foreground">
                Pedido {delivery.orderId.slice(0, 10)}… ·{" "}
                {delivery.customerName || delivery.userName}
              </p>
            </div>
            <DeliveryStatusBadge status={delivery.status} />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="secondary">
              {deliveryMethodLabel[delivery.deliveryMethod]}
            </Badge>
            <span className="text-muted-foreground">
              {delivery.progressSummary}
            </span>
            <span className="text-muted-foreground">
              {formatDateTime(delivery.createdAt)}
            </span>
          </div>
          <div className="mt-3">
            <Button
              size="sm"
              variant="outline"
              render={<Link href={`/admin/deliveries/${delivery.id}`} />}
              nativeButton={false}
            >
              Abrir detalle
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
