import Link from "next/link";
import {
  HiOutlineClipboardList,
  HiOutlineShoppingBag,
  HiOutlineSupport,
  HiOutlineTruck,
  HiOutlineUser,
} from "react-icons/hi";

export function QuickActions({
  prioritizeProfile,
}: {
  prioritizeProfile: boolean;
}) {
  const actions = [
    prioritizeProfile
      ? {
          href: "/dashboard/profile",
          label: "Completar perfil",
          icon: HiOutlineUser,
        }
      : {
          href: "/cart",
          label: "Explorar productos",
          icon: HiOutlineShoppingBag,
        },
    {
      href: "/dashboard/orders",
      label: "Ver pedidos",
      icon: HiOutlineClipboardList,
    },
    {
      href: "/dashboard/deliveries",
      label: "Ver entregas",
      icon: HiOutlineTruck,
    },
    {
      href: "/dashboard/support",
      label: "Contactar soporte",
      icon: HiOutlineSupport,
    },
  ];

  return (
    <section aria-labelledby="quick-actions-heading" className="space-y-3">
      <h2
        id="quick-actions-heading"
        className="font-heading text-lg font-semibold"
      >
        Acciones rápidas
      </h2>
      <ul className="grid gap-2 sm:grid-cols-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <li key={action.href}>
              <Link
                href={action.href}
                className="flex min-h-11 items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm transition-colors hover:bg-muted/40"
              >
                <Icon className="size-5 text-muted-foreground" />
                {action.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
