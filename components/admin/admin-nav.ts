import type { TablerIcon } from "@tabler/icons-react";
import {
  IconLayoutDashboard,
  IconPackage,
  IconUser,
} from "@tabler/icons-react";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: TablerIcon;
};

export const adminNavItems: AdminNavItem[] = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: IconLayoutDashboard,
  },
  {
    href: "/admin/products",
    label: "Productos",
    icon: IconPackage,
  },
  {
    href: "/dashboard",
    label: "Mi cuenta",
    icon: IconUser,
  },
];

export function isAdminNavActive(href: string, pathname: string): boolean {
  if (href === "/admin") {
    return pathname === "/admin";
  }
  if (href === "/dashboard") {
    return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
