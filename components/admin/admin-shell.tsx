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
          <div className="flex-1 px-3 py-4 md:px-8 md:py-8 bg-muted/40 dark:bg-muted/10 relative">
            {/* Subtle decorative background grid */}
            <div className="admin-dashboard-grid absolute inset-0 opacity-40 dark:opacity-20 pointer-events-none" />
            <div className="relative z-10">{children}</div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
