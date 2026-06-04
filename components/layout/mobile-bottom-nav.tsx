"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconHome,
  IconLayoutGrid,
  IconBolt,
  IconShoppingCart,
  IconUser,
} from "@tabler/icons-react";
import { storeRoutes } from "@/lib/store/navigation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type MobileBottomNavProps = {
  cartCount: number;
  isAuthenticated: boolean;
};

export function MobileBottomNav({
  cartCount,
  isAuthenticated,
}: MobileBottomNavProps) {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Inicio",
      href: storeRoutes.home,
      icon: IconHome,
      active: pathname === storeRoutes.home,
    },
    {
      label: "Catálogo",
      href: storeRoutes.catalog,
      icon: IconLayoutGrid,
      active: pathname === storeRoutes.catalog || pathname.startsWith("/catalog/"),
    },
    {
      label: "Ofertas",
      href: storeRoutes.offers,
      icon: IconBolt,
      active: pathname === storeRoutes.offers,
    },
    {
      label: "Carrito",
      href: storeRoutes.cart,
      icon: IconShoppingCart,
      active: pathname === storeRoutes.cart,
      badge: cartCount > 0 ? cartCount : undefined,
    },
    {
      label: "Cuenta",
      href: isAuthenticated ? "/dashboard" : storeRoutes.signIn,
      icon: IconUser,
      active: isAuthenticated
        ? pathname.startsWith("/dashboard")
        : pathname.startsWith("/auth/"),
    },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 h-16 border-t border-border/80 bg-background/95 backdrop-blur-md z-50 flex items-center justify-around px-2 shadow-lg safe-bottom">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.label}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full min-h-11 min-w-11 text-muted-foreground/80 hover:text-foreground transition-all relative group",
              item.active && "text-primary"
            )}
          >
            <div className="relative p-1 rounded-xl group-active:scale-95 transition-transform duration-100">
              {item.active && (
                <span className="absolute inset-0 bg-primary/10 rounded-xl -z-10 animate-in fade-in-0 zoom-in-95 duration-150" />
              )}
              <Icon className="size-5.5 stroke-[1.8]" />
              {item.badge !== undefined && (
                <Badge className="absolute -top-1.5 -right-2 size-4.5 p-0 flex items-center justify-center text-[9px] font-bold bg-primary text-primary-foreground border border-background rounded-full">
                  {item.badge}
                </Badge>
              )}
            </div>
            <span className="text-[10px] font-bold mt-1 tracking-wide uppercase select-none">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
