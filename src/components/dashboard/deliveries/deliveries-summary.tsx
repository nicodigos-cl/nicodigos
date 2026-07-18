import Link from "next/link";
import {
  HiOutlineArrowRight,
  HiOutlineExclamationCircle,
  HiOutlineClock,
  HiOutlineTruck,
  HiOutlineCheckCircle,
} from "react-icons/hi";

import {
  CUSTOMER_DELIVERIES_PATH,
  customerDeliveriesPath,
} from "@/lib/customer-dashboard/paths";
import type { CustomerDeliveryMetrics } from "@/lib/customer-dashboard/types";
import { cn } from "@/lib/utils";

const cards = [
  {
    key: "totalDeliveries" as const,
    title: "Entregas totales",
    href: CUSTOMER_DELIVERIES_PATH,
    linkLabel: "Ver todas",
    icon: HiOutlineTruck,
    isActive: (activeFilter?: string) =>
      !activeFilter || activeFilter === "all",
  },
  {
    key: "available" as const,
    title: "Disponibles",
    href: customerDeliveriesPath({ filter: "available" }),
    linkLabel: "Ver disponibles",
    icon: HiOutlineCheckCircle,
    isActive: (activeFilter?: string) =>
      activeFilter === "available" || activeFilter === "completed",
  },
  {
    key: "processing" as const,
    title: "En proceso",
    href: customerDeliveriesPath({ filter: "processing" }),
    linkLabel: "Ver en proceso",
    icon: HiOutlineClock,
    isActive: (activeFilter?: string) => activeFilter === "processing",
  },
  {
    key: "needsAttention" as const,
    title: "Requieren atención",
    href: customerDeliveriesPath({ filter: "problems" }),
    linkLabel: "Ver problemas",
    icon: HiOutlineExclamationCircle,
    isActive: (activeFilter?: string) => activeFilter === "problems",
  },
] as const;

export function DeliveriesSummary({
  metrics,
  activeFilter,
}: {
  metrics: CustomerDeliveryMetrics;
  activeFilter?: string;
}) {
  return (
    <section aria-label="Resumen de entregas" className="space-y-4">
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          const active = card.isActive(activeFilter);

          return (
            <li key={card.key}>
              <Link
                href={card.href}
                className={cn(
                  "group flex h-full flex-col justify-between gap-4 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/30 hover:bg-muted/10",
                  active && "border-primary ring-1 ring-primary/20",
                )}
              >
                <div className="flex items-start justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </span>
                  <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
                    <Icon className="size-5" />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="font-heading text-3xl font-bold tabular-nums tracking-tight text-foreground">
                    {metrics[card.key]}
                  </p>
                  <div className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                    <span>{card.linkLabel}</span>
                    <HiOutlineArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
