import Link from "next/link";
import {
  HiOutlineClipboardList,
  HiOutlineShoppingBag,
  HiOutlineSupport,
  HiOutlineTruck,
  HiOutlineUser,
  HiOutlineChevronRight,
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
          description: "Actualiza tus datos de contacto y facturación",
          iconColor: "text-amber-500 bg-amber-500/10 dark:text-amber-400 dark:bg-amber-500/10",
        }
      : {
          href: "/cart",
          label: "Explorar productos",
          icon: HiOutlineShoppingBag,
          description: "Mira nuestro catálogo de llaves digitales, cuentas y más",
          iconColor: "text-blue-500 bg-blue-500/10 dark:text-blue-400 dark:bg-blue-500/10",
        },
    {
      href: "/dashboard/pedidos",
      label: "Ver pedidos",
      icon: HiOutlineClipboardList,
      description: "Revisa el estado de tus compras anteriores",
      iconColor: "text-emerald-500 bg-emerald-500/10 dark:text-emerald-400 dark:bg-emerald-500/10",
    },
    {
      href: "/dashboard/deliveries",
      label: "Ver entregas",
      icon: HiOutlineTruck,
      description: "Accede a tus llaves y cuentas de forma directa",
      iconColor: "text-indigo-500 bg-indigo-500/10 dark:text-indigo-400 dark:bg-indigo-500/10",
    },
    {
      href: "/dashboard/support",
      label: "Contactar soporte",
      icon: HiOutlineSupport,
      description: "Escríbenos si tienes dudas con tus servicios o pagos",
      iconColor: "text-rose-500 bg-rose-500/10 dark:text-rose-400 dark:bg-rose-500/10",
    },
  ];

  return (
    <section aria-labelledby="quick-actions-heading" className="space-y-4">
      <h2
        id="quick-actions-heading"
        className="font-heading text-lg font-semibold text-foreground"
      >
        Acciones rápidas
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <li key={action.href}>
              <Link
                href={action.href}
                className="group flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 transition-all duration-300 hover:border-primary/50 hover:bg-accent/5"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className={`rounded-xl p-2.5 ${action.iconColor}`}>
                    <Icon className="size-5 shrink-0" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-foreground transition-colors group-hover:text-primary">
                      {action.label}
                    </p>
                    <p className="text-xs text-muted-foreground truncate max-w-[240px] sm:max-w-xs md:max-w-md">
                      {action.description}
                    </p>
                  </div>
                </div>
                <HiOutlineChevronRight className="size-4 shrink-0 text-muted-foreground transition-colors duration-300 group-hover:text-primary" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
