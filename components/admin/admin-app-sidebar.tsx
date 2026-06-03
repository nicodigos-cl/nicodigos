"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/logo";
import {
  adminNavItems,
  isAdminNavActive,
  type AdminNavItem,
} from "@/components/admin/admin-nav";
import type { DashboardUserMenuUser } from "@/components/dashboard/dashboard-user-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
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
  useSidebar,
} from "@/components/ui/sidebar";
import { getUserInitials } from "@/lib/dashboard/format";
import { cn } from "@/lib/utils";

function AdminSidebarMenu({ items }: { items: AdminNavItem[] }) {
  const pathname = usePathname();
  const { setOpenMobile, isMobile } = useSidebar();

  function closeMobileNav() {
    if (isMobile) {
      setOpenMobile(false);
    }
  }

  return (
    <SidebarMenu>
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = isAdminNavActive(item.href, pathname);

        return (
          <SidebarMenuItem key={item.href + item.label}>
            <SidebarMenuButton
              asChild
              isActive={isActive}
              size="lg"
              tooltip={item.label}
              className="min-h-10"
            >
              <Link href={item.href} onClick={closeMobileNav}>
                <Icon />
                <span>{item.label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

type AdminAppSidebarProps = {
  user: DashboardUserMenuUser;
};

export function AdminAppSidebar({ user }: AdminAppSidebarProps) {
  const initials = getUserInitials(user.name);

  return (
    <Sidebar collapsible="offcanvas" variant="sidebar">
      <SidebarHeader className="px-4 py-4">
        <Logo href="/admin" size="md" />
        <p className="text-xs text-muted-foreground">Panel de administración</p>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegación</SidebarGroupLabel>
          <SidebarGroupContent>
            <AdminSidebarMenu items={adminNavItems} />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className={cn("pb-4")}>
        <SidebarSeparator />
        <SidebarMenu>
          <SidebarMenuItem>
            <Item size="sm" variant="muted" className="border-0 bg-transparent">
              <ItemMedia>
                <Avatar size="sm">
                  {user.image ? (
                    <AvatarImage src={user.image} alt={user.name} />
                  ) : null}
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              </ItemMedia>
              <ItemContent>
                <ItemTitle>{user.name}</ItemTitle>
                <ItemDescription>{user.email}</ItemDescription>
              </ItemContent>
            </Item>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
