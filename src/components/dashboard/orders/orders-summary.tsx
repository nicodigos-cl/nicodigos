import Link from "next/link";
import {
  HiOutlineArrowRight,
  HiOutlineExclamationCircle,
  HiOutlineShoppingBag,
  HiOutlineTruck,
} from "react-icons/hi";

import {
  CUSTOMER_ORDERS_PATH,
  customerDeliveriesPath,
  customerOrdersPath,
} from "@/lib/customer-dashboard/paths";
import type { CustomerOrderMetrics } from "@/lib/customer-dashboard/types";
import { cn } from "@/lib/utils";

const cards = [
  {
    key: "totalOrders" as const,
    title: "Pedidos totales",
    href: CUSTOMER_ORDERS_PATH,
    linkLabel: "Ver todos",
    icon: HiOutlineShoppingBag,
    isActive: (activeStatus?: string) =>
      !activeStatus || activeStatus === "all",
  },
  {
    key: "inProgress" as const,
    title: "En proceso",
    href: customerOrdersPath({ status: "processing" }),
    linkLabel: "Ver en proceso",
    icon: HiOutlineShoppingBag,
    isActive: (activeStatus?: string) => activeStatus === "processing",
  },
  {
    key: "availableDeliveries" as const,
    title: "Entregas disponibles",
    href: customerDeliveriesPath({ filter: "available" }),
    linkLabel: "Ver entregas",
    icon: HiOutlineTruck,
    isActive: () => false,
  },
  {
    key: "needsAttention" as const,
    title: "Requieren atención",
    href: customerOrdersPath({ status: "pending" }),
    linkLabel: "Ver pendientes",
    icon: HiOutlineExclamationCircle,
    isActive: (activeStatus?: string) => activeStatus === "pending",
  },
] as const;

export function OrdersSummary({
  metrics,
  activeStatus,
}: {
  metrics: CustomerOrderMetrics;
  activeStatus?: string;
}) {
  return (
    <section aria-label="Resumen de pedidos" className="space-y-4">
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          const active = card.isActive(activeStatus);

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
