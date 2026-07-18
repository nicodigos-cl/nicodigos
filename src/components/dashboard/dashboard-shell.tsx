"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { HiOutlineLogout, HiOutlineShoppingCart } from "react-icons/hi";

import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { signOut } from "@/lib/auth-client";

export function DashboardShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: {
    name: string | null;
    email: string;
    image: string | null;
  };
}) {
  const router = useRouter();
  const initials =
    (user.name || user.email)
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  function handleSignOut() {
    void signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/auth/login");
          router.refresh();
        },
      },
    });
  }

  return (
    <SidebarProvider>
      <DashboardSidebar />
      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/95 px-4 backdrop-blur-sm supports-backdrop-filter:bg-background/80 md:px-6">
          <SidebarTrigger className="-ml-1" />
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <Button
              variant="ghost"
              size="icon"
              render={<Link href="/cart" />}
              nativeButton={false}
              aria-label="Ir al carrito"
            >
              <HiOutlineShoppingCart className="size-5" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    className="h-9 gap-2 rounded-full px-1.5 sm:px-2"
                    aria-label="Menú de usuario"
                  />
                }
              >
                <Avatar size="sm">
                  {user.image ? (
                    <AvatarImage src={user.image} alt="" />
                  ) : null}
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <span className="hidden max-w-32 truncate text-sm font-medium md:inline">
                  {user.name || "Cuenta"}
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="truncate text-sm font-medium">
                    {user.name || "Cuenta"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  render={<Link href="/dashboard/profile" />}
                >
                  Perfil
                </DropdownMenuItem>
                <DropdownMenuItem
                  render={<Link href="/dashboard/security" />}
                >
                  Seguridad
                </DropdownMenuItem>
                <DropdownMenuItem
                  render={<Link href="/dashboard/support" />}
                >
                  Soporte
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <HiOutlineLogout className="size-4" />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
