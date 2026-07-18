"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { IconType } from "react-icons";
import {
  HiOutlineCreditCard,
  HiOutlineHome,
  HiOutlineLockClosed,
  HiOutlineBell,
  HiOutlineLogout,
  HiOutlineShoppingBag,
  HiOutlineShoppingCart,
  HiOutlineSupport,
  HiOutlineTruck,
  HiOutlineUser,
  HiOutlineViewGrid,
} from "react-icons/hi";

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
} from "@/components/ui/sidebar";
import { signOut } from "@/lib/auth-client";
import { logoutOneSignal } from "@/lib/onesignal/client";
import { cn } from "@/lib/utils";

type NavItem = {
  title: string;
  href: string;
  icon: IconType;
  match?: (pathname: string) => boolean;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const navigationGroups: NavGroup[] = [
  {
    label: "General",
    items: [
      {
        title: "Resumen",
        href: "/dashboard",
        icon: HiOutlineViewGrid,
        match: (pathname) => pathname === "/dashboard",
      },
      {
        title: "Mis pedidos",
        href: "/dashboard/pedidos",
        icon: HiOutlineShoppingBag,
        match: (pathname) =>
          pathname.startsWith("/dashboard/pedidos") ||
          pathname.startsWith("/dashboard/orders"),
      },
      {
        title: "Mis entregas",
        href: "/dashboard/deliveries",
        icon: HiOutlineTruck,
        match: (pathname) => pathname.startsWith("/dashboard/deliveries"),
      },
      {
        title: "Transacciones",
        href: "/dashboard/transactions",
        icon: HiOutlineCreditCard,
        match: (pathname) => pathname.startsWith("/dashboard/transactions"),
      },
    ],
  },
  {
    label: "Cuenta",
    items: [
      {
        title: "Perfil",
        href: "/dashboard/profile",
        icon: HiOutlineUser,
        match: (pathname) => pathname.startsWith("/dashboard/profile"),
      },
      {
        title: "Seguridad",
        href: "/dashboard/security",
        icon: HiOutlineLockClosed,
        match: (pathname) => pathname.startsWith("/dashboard/security"),
      },
      {
        title: "Notificaciones",
        href: "/dashboard/notifications",
        icon: HiOutlineBell,
        match: (pathname) => pathname.startsWith("/dashboard/notifications"),
      },
      {
        title: "Soporte",
        href: "/dashboard/support",
        icon: HiOutlineSupport,
        match: (pathname) => pathname.startsWith("/dashboard/support"),
      },
    ],
  },
  {
    label: "Comprar",
    items: [
      {
        title: "Tienda",
        href: "/",
        icon: HiOutlineHome,
      },
      {
        title: "Carrito",
        href: "/cart",
        icon: HiOutlineShoppingCart,
      },
    ],
  },
];

export function DashboardSidebar() {
  const pathname = usePathname();

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

      <SidebarContent className="gap-4 py-3">
        {navigationGroups.map((group) => (
          <SidebarGroup key={group.label} className="px-2 py-0">
            <SidebarGroupLabel className="mb-1.5 h-6 px-2 font-mono text-[10px] font-bold tracking-wider text-muted-foreground/80 uppercase select-none group-data-[collapsible=icon]:opacity-0">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-2">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.match
                    ? item.match(pathname)
                    : pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={isActive}
                        tooltip={item.title}
                        render={<Link href={item.href} />}
                        className={cn(
                          "h-11 gap-3.5 rounded-sm border-l-2 border-transparent text-base transition-all hover:bg-sidebar-accent/50 [&_svg]:size-5!",
                          isActive &&
                            "border-l-primary bg-sidebar-accent pl-4 font-mono text-primary hover:bg-sidebar-accent",
                        )}
                      >
                        <Icon />
                        <span className="flex items-center gap-1 select-none">
                          {item.title}
                        </span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="mt-auto border-t border-sidebar-border p-0">
        <SidebarMenu className="gap-1 p-2">
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Cerrar sesión"
              className="h-11 gap-3.5 rounded-sm text-base text-destructive hover:bg-destructive/10 hover:text-destructive [&_svg]:size-5!"
              onClick={() => {
                void (async () => {
                  await logoutOneSignal();
                  await signOut({
                    fetchOptions: {
                      onSuccess: () => {
                        window.location.href = "/auth/login";
                      },
                    },
                  });
                })();
              }}
            >
              <HiOutlineLogout />
              <span>Cerrar sesión</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
