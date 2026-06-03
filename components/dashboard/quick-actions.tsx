import Link from "next/link";
import {
  IconHeadset,
  IconReceipt,
  IconShield,
  IconShoppingBag,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type QuickActionsProps = {
  isAdmin: boolean;
};

const baseActions = [
  {
    title: "Explorar tienda",
    description: "Descubre keys y ofertas",
    href: "/",
    icon: IconShoppingBag,
  },
  {
    title: "Ver pedidos",
    description: "Historial completo",
    href: "/dashboard/orders",
    icon: IconReceipt,
  },
  {
    title: "Soporte",
    description: "Ayuda con tu cuenta",
    href: "mailto:soporte@nicodigos.com",
    icon: IconHeadset,
  },
] as const;

const adminAction = {
  title: "Panel admin",
  description: "Gestión de la tienda",
  href: "/admin",
  icon: IconShield,
} as const;

import { IconChevronRight } from "@tabler/icons-react";

export function QuickActions({ isAdmin }: QuickActionsProps) {
  const actions = isAdmin ? [...baseActions, adminAction] : baseActions;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-heading text-base font-semibold tracking-tight">
          Acciones rápidas
        </h2>
        <p className="text-sm text-muted-foreground">
          Accede a lo más usado en un toque
        </p>
      </div>
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-1">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <Link
              key={action.title}
              href={action.href}
              className="group relative flex items-center justify-between rounded-[min(var(--radius-4xl),24px)] border border-border/40 bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/20"
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-muted text-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                    {action.title}
                  </h3>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {action.description}
                  </p>
                </div>
              </div>
              
              <IconChevronRight className="size-4 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:text-primary ml-2 shrink-0" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
