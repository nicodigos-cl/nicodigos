import type { ReactNode } from "react";
import Link from "next/link";
import {
  HiHome,
  HiOutlineCollection,
  HiOutlineShoppingCart,
  HiOutlineUser,
} from "react-icons/hi";

import { Logo } from "@/components/logo";
import StoreFooter from "@/components/layout/store-footer";
import StoreNav from "@/components/layout/store-nav";

type StoreLayoutProps = {
  children: ReactNode;
};

export default function StoreLayout({ children }: StoreLayoutProps) {
  return (
    <div className="min-h-full bg-background pb-20 lg:pb-0 max-lg:pt-16">
      {/* Mobile Top App Bar (Android Style) */}
      <header className="fixed top-0 inset-x-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/40 py-3.5 px-4 flex items-center justify-between lg:hidden shadow-xs">
        <div className="flex items-center">
          <Logo size={32} href={false} />
        </div>
        <div className="flex items-center">
          <Link
            href="/cart"
            className="p-1.5 hover:bg-muted/80 rounded-full transition-all active:scale-90"
            aria-label="Ver carrito"
          >
            <HiOutlineShoppingCart className="size-6 text-foreground" />
          </Link>
        </div>
      </header>

      <div className="hidden lg:block">
        <StoreNav />
      </div>

      <main>{children}</main>

      {/* Mobile Bottom Navigation Bar (Android Material 3 Style) */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur-md border-t border-border/40 py-2 px-6 flex items-center justify-around lg:hidden shadow-lg pb-safe m-0">
        <Link
          href="/"
          className="flex flex-col items-center gap-0.5 group active:scale-95 transition-all"
        >
          <div className="px-5 py-1 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary/20">
            <HiHome className="size-5 shrink-0" />
          </div>
          <span className="text-[10px] font-extrabold text-primary tracking-tight">
            Inicio
          </span>
        </Link>
        <Link
          href="/categories"
          className="flex flex-col items-center gap-0.5 group active:scale-95 transition-all"
        >
          <div className="px-5 py-1 rounded-full text-muted-foreground group-hover:bg-muted group-hover:text-foreground flex items-center justify-center">
            <HiOutlineCollection className="size-5 shrink-0" />
          </div>
          <span className="text-[10px] font-bold text-muted-foreground group-hover:text-foreground tracking-tight">
            Catálogo
          </span>
        </Link>
        <Link
          href="/cart"
          className="flex flex-col items-center gap-0.5 group active:scale-95 transition-all"
        >
          <div className="px-5 py-1 rounded-full text-muted-foreground group-hover:bg-muted group-hover:text-foreground flex items-center justify-center">
            <HiOutlineShoppingCart className="size-5 shrink-0" />
          </div>
          <span className="text-[10px] font-bold text-muted-foreground group-hover:text-foreground tracking-tight">
            Carrito
          </span>
        </Link>
        <Link
          href="/dashboard"
          className="flex flex-col items-center gap-0.5 group active:scale-95 transition-all"
        >
          <div className="px-5 py-1 rounded-full text-muted-foreground group-hover:bg-muted group-hover:text-foreground flex items-center justify-center">
            <HiOutlineUser className="size-5 shrink-0" />
          </div>
          <span className="text-[10px] font-bold text-muted-foreground group-hover:text-foreground tracking-tight">
            Mi Cuenta
          </span>
        </Link>
      </nav>

      <div className="hidden lg:block">
        <StoreFooter />
      </div>
    </div>
  );
}
