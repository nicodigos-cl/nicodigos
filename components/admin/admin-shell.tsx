"use client";

import { AdminAppSidebar } from "@/components/admin/admin-app-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";
import type { DashboardUserMenuUser } from "@/components/dashboard/dashboard-user-menu";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

type AdminShellProps = {
  user: DashboardUserMenuUser;
  title?: string;
  children: React.ReactNode;
};

export function AdminShell({
  user,
  title = "Admin",
  children,
}: AdminShellProps) {
  return (
    <TooltipProvider>
      <SidebarProvider className="min-h-dvh bg-muted/30">
        <AdminAppSidebar user={user} />
        <SidebarInset className="min-h-dvh min-w-0">
          <AdminHeader title={title} user={user} />
          <div className="flex-1 px-3 py-4 md:px-8 md:py-8">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
