import type { TablerIcon } from "@tabler/icons-react";
import {
  IconKey,
  IconLayoutDashboard,
  IconReceipt,
  IconSettings,
  IconShield,
  IconShoppingBag,
} from "@tabler/icons-react";

export type DashboardNavItem = {
  href: string;
  label: string;
  icon: TablerIcon;
  adminOnly?: boolean;
};

export const dashboardNavItems: DashboardNavItem[] = [
  {
    href: "/dashboard",
    label: "Inicio",
    icon: IconLayoutDashboard,
  },
  {
    href: "/",
    label: "Tienda",
    icon: IconShoppingBag,
  },
  {
    href: "/dashboard/orders",
    label: "Pedidos",
    icon: IconReceipt,
  },
  {
    href: "/dashboard/keys",
    label: "Mis claves",
    icon: IconKey,
  },
  {
    href: "/dashboard/settings",
    label: "Configuración",
    icon: IconSettings,
  },
  {
    href: "/admin",
    label: "Panel admin",
    icon: IconShield,
    adminOnly: true,
  },
];

export function getVisibleNavItems(role?: string | null): DashboardNavItem[] {
  return dashboardNavItems.filter(
    (item) => !item.adminOnly || role === "ADMIN",
  );
}

export function isDashboardNavActive(href: string, pathname: string): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
