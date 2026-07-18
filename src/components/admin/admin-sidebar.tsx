"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CreditCardIcon,
  DashboardSquare01Icon,
  DeliveryTruck01Icon,
  Logout01Icon,
  Package01Icon,
  ServerStack01Icon,
  Settings01Icon,
  ShoppingBag01Icon,
  Tag01Icon,
  UserMultiple02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type NavItem = {
  title: string;
  href: string;
  icon: IconSvgElement;
  match?: (pathname: string) => boolean;
};

const mainNav: NavItem[] = [
  {
    title: "Dashboard",
    href: "/admin",
    icon: DashboardSquare01Icon,
    match: (pathname) => pathname === "/admin",
  },
  {
    title: "Productos",
    href: "/admin/products",
    icon: Package01Icon,
    match: (pathname) => pathname.startsWith("/admin/products"),
  },
  {
    title: "Providers SMM",
    href: "/admin/providers",
    icon: ServerStack01Icon,
    match: (pathname) => pathname.startsWith("/admin/providers"),
  },
  {
    title: "Categorías",
    href: "/admin/categories",
    icon: Tag01Icon,
    match: (pathname) => pathname.startsWith("/admin/categories"),
  },
  {
    title: "Órdenes",
    href: "/admin/orders",
    icon: ShoppingBag01Icon,
    match: (pathname) => pathname.startsWith("/admin/orders"),
  },
  {
    title: "Entregas",
    href: "/admin/deliveries",
    icon: DeliveryTruck01Icon,
    match: (pathname) => pathname.startsWith("/admin/deliveries"),
  },
  {
    title: "Pagos",
    href: "/admin/payments",
    icon: CreditCardIcon,
    match: (pathname) => pathname.startsWith("/admin/payments"),
  },
  {
    title: "Usuarios",
    href: "/admin/users",
    icon: UserMultiple02Icon,
    match: (pathname) => pathname.startsWith("/admin/users"),
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader className="border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link href="/admin" />}
              className="gap-3"
            >
              <span className="flex size-8 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
                <HugeiconsIcon icon={Package01Icon} strokeWidth={2} />
              </span>
              <span className="flex min-w-0 flex-col text-left">
                <span className="truncate font-heading text-sm font-semibold">
                  Nicodigos
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  Panel admin
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              {mainNav.map((item) => {
                const isActive = item.match
                  ? item.match(pathname)
                  : pathname.startsWith(item.href);

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.title}
                      render={<Link href={item.href} />}
                      className="h-11 gap-3 text-base [&_svg]:size-5"
                    >
                      <HugeiconsIcon icon={item.icon} strokeWidth={2} />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="mt-auto border-t border-sidebar-border">
        <SidebarSeparator className="mx-0" />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Ajustes"
              render={<Link href="/admin" />}
              className="h-11 gap-3 text-base [&_svg]:size-5"
            >
              <HugeiconsIcon icon={Settings01Icon} strokeWidth={2} />
              <span>Ajustes</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Cerrar sesión"
              className={cn("text-destructive hover:text-destructive h-11 gap-3 text-base [&_svg]:size-5")}
              onClick={() => {
                void signOut({
                  fetchOptions: {
                    onSuccess: () => {
                      window.location.href = "/";
                    },
                  },
                });
              }}
            >
              <HugeiconsIcon icon={Logout01Icon} strokeWidth={2} />
              <span>Cerrar sesión</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
