"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CatalogueIcon,
  CreditCardIcon,
  DashboardSquare01Icon,
  DeliveryTruck01Icon,
  GameController01Icon,
  Logout01Icon,
  Mail01Icon,
  Package01Icon,
  ServerStack01Icon,
  Settings01Icon,
  ShoppingBag01Icon,
  Tag01Icon,
  UserMultiple02Icon,
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
import { logoutOneSignal } from "@/lib/onesignal/client";
import { cn } from "@/lib/utils";

type NavItem = {
  title: string;
  href: string;
  icon: IconSvgElement;
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
        title: "Dashboard",
        href: "/admin",
        icon: DashboardSquare01Icon,
        match: (pathname) => pathname === "/admin",
      },
      {
        title: "Usuarios",
        href: "/admin/users",
        icon: UserMultiple02Icon,
        match: (pathname) => pathname.startsWith("/admin/users"),
      },
      {
        title: "Comunicaciones",
        href: "/admin/communications",
        icon: Mail01Icon,
        match: (pathname) => pathname.startsWith("/admin/communications"),
      },
    ],
  },
  {
    label: "Catálogo",
    items: [
      {
        title: "Productos",
        href: "/admin/products",
        icon: Package01Icon,
        match: (pathname) => pathname.startsWith("/admin/products"),
      },
      {
        title: "Categorías",
        href: "/admin/categories",
        icon: Tag01Icon,
        match: (pathname) => pathname.startsWith("/admin/categories"),
      },
    ],
  },
  {
    label: "SMM & Proveedores",
    items: [
      {
        title: "Providers SMM",
        href: "/admin/providers",
        icon: ServerStack01Icon,
        match: (pathname) => pathname.startsWith("/admin/providers"),
      },
      {
        title: "Servicios SMM",
        href: "/admin/services",
        icon: CatalogueIcon,
        match: (pathname) => pathname.startsWith("/admin/services"),
      },
      {
        title: "Kinguin",
        href: "/admin/kinguin",
        icon: GameController01Icon,
        match: (pathname) => pathname.startsWith("/admin/kinguin"),
      },
    ],
  },
  {
    label: "Ventas & Operaciones",
    items: [
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
        title: "Transacciones",
        href: "/admin/transactions",
        icon: CreditCardIcon,
        match: (pathname) => pathname.startsWith("/admin/transactions"),
      },
    ],
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
              <Logo size={32} href={false} className="shrink-0" />
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

      <SidebarContent className="gap-4 py-3">
        {navigationGroups.map((group) => (
          <SidebarGroup key={group.label} className="py-0 px-2">
            <SidebarGroupLabel className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 mb-1.5 px-2 select-none h-6 group-data-[collapsible=icon]:opacity-0">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {group.items.map((item) => {
                  const isActive = item.match
                    ? item.match(pathname)
                    : pathname.startsWith(item.href);

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={isActive}
                        tooltip={item.title}
                        render={<Link href={item.href} />}
                        className={cn(
                          "h-11 gap-3.5 text-base transition-all rounded-sm border-l-2 border-transparent hover:bg-sidebar-accent/50 [&_svg]:size-5!",
                          isActive && "font-mono border-l-primary bg-sidebar-accent text-primary hover:bg-sidebar-accent pl-4"
                        )}
                      >
                        <HugeiconsIcon icon={item.icon} strokeWidth={2} />
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

      <SidebarFooter className="mt-auto gap-0 border-t border-sidebar-border p-0">
        <div className="px-4 py-3 font-mono text-[10px] text-muted-foreground border-b border-sidebar-border bg-sidebar-accent/10 group-data-[collapsible=icon]:hidden">
          <div className="flex items-center justify-between">
            <span>SYS_STATUS</span>
            <span className="text-emerald-500 font-bold flex items-center gap-1">
              <span className="inline-block size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              ONLINE
            </span>
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span>ENV_ZONE</span>
            <span>CL-SCL-PROD</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span>DATABASE</span>
            <span className="text-emerald-500 font-medium">CONNECTED</span>
          </div>
        </div>
        <SidebarMenu className="p-2 gap-1">
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Ajustes"
              isActive={pathname.startsWith("/admin/settings")}
              render={<Link href="/admin/settings" />}
              className={cn(
                "h-11 gap-3.5 text-base rounded-sm hover:bg-sidebar-accent/50 [&_svg]:size-5!",
                pathname.startsWith("/admin/settings") &&
                  "font-mono border-l-2 border-l-primary bg-sidebar-accent text-primary hover:bg-sidebar-accent pl-4",
              )}
            >
              <HugeiconsIcon icon={Settings01Icon} strokeWidth={2} />
              <span>Ajustes</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Cerrar sesión"
              className={cn("text-destructive hover:text-destructive h-11 gap-3.5 text-base rounded-sm hover:bg-destructive/10 [&_svg]:size-5!")}
              onClick={() => {
                void (async () => {
                  await logoutOneSignal();
                  await signOut({
                    fetchOptions: {
                      onSuccess: () => {
                        window.location.href = "/";
                      },
                    },
                  });
                })();
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
