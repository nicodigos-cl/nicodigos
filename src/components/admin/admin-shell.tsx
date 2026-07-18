"use client";

import { Suspense } from "react";

import { AdminHeader } from "@/components/admin/admin-header";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

type AdminShellProps = {
  children: React.ReactNode;
};

export function AdminShell({ children }: AdminShellProps) {
  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset className="min-w-0 bg-muted/30">
        <Suspense
          fallback={
            <div className="flex h-14 items-center border-b border-border px-4 md:px-6">
              <div className="h-9 w-full max-w-md rounded-3xl bg-muted" />
            </div>
          }
        >
          <AdminHeader />
        </Suspense>
        <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
