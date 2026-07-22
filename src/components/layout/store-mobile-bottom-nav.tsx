"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HiHome,
  HiOutlineCollection,
  HiOutlineHome,
  HiOutlineShoppingCart,
  HiOutlineUser,
  HiCollection,
  HiShoppingCart,
  HiUser,
} from "react-icons/hi";

import { cn } from "@/lib/utils";

const items = [
  {
    href: "/",
    label: "Inicio",
    match: (pathname: string) => pathname === "/",
    Icon: HiOutlineHome,
    IconActive: HiHome,
  },
  {
    href: "/catalog",
    label: "Catálogo",
    match: (pathname: string) =>
      pathname === "/catalog" ||
      pathname.startsWith("/catalog/") ||
      pathname.startsWith("/products/") ||
      pathname === "/categories" ||
      pathname.startsWith("/categories/"),
    Icon: HiOutlineCollection,
    IconActive: HiCollection,
  },
  {
    href: "/cart",
    label: "Carrito",
    match: (pathname: string) =>
      pathname === "/cart" || pathname.startsWith("/cart/"),
    Icon: HiOutlineShoppingCart,
    IconActive: HiShoppingCart,
  },
  {
    href: "/dashboard",
    label: "Mi Cuenta",
    match: (pathname: string) =>
      pathname === "/dashboard" || pathname.startsWith("/dashboard/"),
    Icon: HiOutlineUser,
    IconActive: HiUser,
  },
] as const;

export function StoreMobileBottomNav() {
  const pathname = usePathname();

  if (
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/admin")
  ) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur-md border-t border-border/40 py-2 px-6 flex items-center justify-around lg:hidden shadow-lg pb-safe m-0">
      {items.map((item) => {
        const active = item.match(pathname);
        const Icon = active ? item.IconActive : item.Icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className="flex flex-col items-center gap-0.5 group active:scale-95 transition-all"
          >
            <div
              className={cn(
                "px-5 py-1 rounded-full flex items-center justify-center transition-colors",
                active
                  ? "bg-primary/10 text-primary group-hover:bg-primary/20"
                  : "text-muted-foreground group-hover:bg-muted group-hover:text-foreground",
              )}
            >
              <Icon className="size-5 shrink-0" />
            </div>
            <span
              className={cn(
                "text-[10px] tracking-tight transition-colors",
                active
                  ? "font-extrabold text-primary"
                  : "font-bold text-muted-foreground group-hover:text-foreground",
              )}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
