"use client";

import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DashboardUserMenu,
  type DashboardUserMenuUser,
} from "@/components/dashboard/dashboard-user-menu";

type AdminHeaderProps = {
  title: string;
  user: DashboardUserMenuUser;
};

export function AdminHeader({ title, user }: AdminHeaderProps) {
  return (
    <>
      <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden">
        <SidebarTrigger className="size-10 shrink-0" />
        <Separator orientation="vertical" className="self-stretch" />
        <h1 className="min-w-0 flex-1 truncate font-heading text-base font-semibold tracking-tight">
          {title}
        </h1>
        <DashboardUserMenu user={user} compact />
      </header>

      <header className="hidden h-14 shrink-0 items-center gap-4 border-b border-border bg-background px-6 md:flex">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="self-stretch" />
        <h1 className="min-w-0 font-heading text-lg font-semibold tracking-tight">
          {title}
        </h1>
        <div className="ml-auto flex items-center gap-2">
          <DashboardUserMenu user={user} />
        </div>
      </header>
    </>
  );
}
