"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  IconCategory,
  IconLayoutDashboard,
  IconMenu2,
  IconPackage,
  IconReceipt,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type AdminShellProps = {
  user: { name: string; email: string };
  children: React.ReactNode;
};

const navItems = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: IconLayoutDashboard,
    enabled: true,
  },
  {
    href: "#",
    label: "Products",
    icon: IconPackage,
    enabled: false,
  },
  {
    href: "#",
    label: "Orders",
    icon: IconReceipt,
    enabled: false,
  },
  {
    href: "#",
    label: "Categories",
    icon: IconCategory,
    enabled: false,
  },
] as const;

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      {navItems.map((item) => {
        const isActive = item.enabled && pathname === item.href;
        const Icon = item.icon;

        if (!item.enabled) {
          return (
            <span
              key={item.label}
              className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm text-muted-foreground/60"
              aria-disabled
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
              <span className="ml-auto text-xs">Soon</span>
            </span>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2 rounded-2xl px-3 py-2 text-sm transition-colors",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-sidebar-foreground hover:bg-sidebar-accent/60",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarContent({
  user,
  onNavigate,
}: {
  user: AdminShellProps["user"];
  onNavigate?: () => void;
}) {
  return (
    <>
      <div className="px-5 py-5">
        <p className="font-heading text-lg font-semibold">Repon Admin</p>
        <p className="text-xs text-muted-foreground">E-commerce dashboard</p>
      </div>
      <Separator />
      <SidebarNav onNavigate={onNavigate} />
      <Separator className="mt-auto" />
      <div className="px-5 py-4">
        <p className="truncate text-sm font-medium">{user.name}</p>
        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
      </div>
    </>
  );
}

export function AdminShell({ user, children }: AdminShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-full bg-muted/30">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        <SidebarContent user={user} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border bg-background px-4 py-3 md:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden">
                <IconMenu2 className="size-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Admin navigation</SheetTitle>
              </SheetHeader>
              <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
                <SidebarContent
                  user={user}
                  onNavigate={() => setMobileOpen(false)}
                />
              </div>
            </SheetContent>
          </Sheet>
          <div className="min-w-0 md:hidden">
            <p className="truncate font-heading text-sm font-semibold">
              Repon Admin
            </p>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
