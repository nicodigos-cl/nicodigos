"use client";

import Link from "next/link";
import { HiOutlineTruck } from "react-icons/hi";

import { CustomerStatusBadge } from "@/components/dashboard/customer-status-badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { CustomerDeliverySummary } from "@/lib/customer-dashboard/types";
import { formatDateTime } from "@/lib/format-date";

export function CustomerDeliveriesMobileList({
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
        <li
          key={delivery.id}
          className="rounded-2xl border border-border bg-card p-4"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="font-medium">{delivery.productName}</p>
              <p className="text-sm text-muted-foreground">
                {delivery.methodLabel} · {delivery.orderNumber} ·{" "}
                {formatDateTime(delivery.deliveredAt ?? delivery.createdAt)}
              </p>
              <CustomerStatusBadge
                label={
                  delivery.smm?.statusView.label ?? delivery.statusView.label
                }
                tone={
                  delivery.smm?.statusView.tone ?? delivery.statusView.tone
                }
              />
            </div>
            <Link
              href={delivery.primaryAction.href}
              className="text-sm font-medium text-primary hover:underline"
            >
              {delivery.primaryAction.label}
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
