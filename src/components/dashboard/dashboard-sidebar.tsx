"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CreditCardIcon,
  CustomerService01Icon,
  DashboardSquare01Icon,
  DeliveryTruck01Icon,
  LockIcon,
  Logout01Icon,
  ShoppingBag01Icon,
  ShoppingCart01Icon,
  Store01Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";

import { Logo } from "@/components/logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
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
    title: "Resumen",
    href: "/dashboard",
    icon: DashboardSquare01Icon,
    match: (pathname) => pathname === "/dashboard",
  },
  {
    title: "Mis pedidos",
    href: "/dashboard/orders",
    icon: ShoppingBag01Icon,
    match: (pathname) => pathname.startsWith("/dashboard/orders"),
  },
  {
    title: "Mis entregas",
    href: "/dashboard/deliveries",
    icon: DeliveryTruck01Icon,
    match: (pathname) => pathname.startsWith("/dashboard/deliveries"),
  },
  {
    title: "Transacciones",
    href: "/dashboard/transactions",
    icon: CreditCardIcon,
    match: (pathname) => pathname.startsWith("/dashboard/transactions"),
  },
];

const accountNav: NavItem[] = [
  {
    title: "Perfil",
    href: "/dashboard/profile",
    icon: UserIcon,
    match: (pathname) => pathname.startsWith("/dashboard/profile"),
  },
  {
    title: "Seguridad",
    href: "/dashboard/security",
    icon: LockIcon,
    match: (pathname) => pathname.startsWith("/dashboard/security"),
  },
  {
    title: "Soporte",
    href: "/dashboard/support",
    icon: CustomerService01Icon,
    match: (pathname) => pathname.startsWith("/dashboard/support"),
  },
];

const shopNav: NavItem[] = [
  {
    title: "Tienda",
    href: "/",
    icon: Store01Icon,
  },
  {
    title: "Carrito",
    href: "/cart",
    icon: ShoppingCart01Icon,
  },
];

function NavGroup({
  label,
  items,
}: {
  label?: string;
  items: NavItem[];
}) {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      {label ? <SidebarGroupLabel>{label}</SidebarGroupLabel> : null}
      <SidebarGroupContent>
        <SidebarMenu className="gap-1">
          {items.map((item) => {
            const isActive = item.match
              ? item.match(pathname)
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  isActive={isActive}
                  tooltip={item.title}
                  render={<Link href={item.href} />}
                  className="h-10 gap-3 [&_svg]:size-4"
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
  );
}

export function DashboardSidebar() {
  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader className="border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link href="/dashboard" />}
              className="gap-3"
            >
              <Logo size={32} href={false} className="shrink-0" />
              <span className="flex min-w-0 flex-col text-left">
                <span className="truncate font-heading text-sm font-semibold">
                  Nicodigos
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  Mi cuenta
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavGroup items={mainNav} />
        <NavGroup label="Cuenta" items={accountNav} />
        <NavGroup label="Comprar" items={shopNav} />
      </SidebarContent>

      <SidebarFooter className="mt-auto border-t border-sidebar-border">
        <SidebarSeparator className="mx-0" />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Cerrar sesión"
              className={cn(
                "h-10 gap-3 text-destructive hover:text-destructive [&_svg]:size-4",
              )}
              onClick={() => {
                void signOut({
                  fetchOptions: {
                    onSuccess: () => {
                      window.location.href = "/auth/login";
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
