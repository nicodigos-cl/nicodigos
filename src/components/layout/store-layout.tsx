import type { ReactNode } from "react";
import Link from "next/link";
import { HiOutlineShoppingCart } from "react-icons/hi";

import { Logo } from "@/components/logo";
import StoreFooter from "@/components/layout/store-footer";
import { StoreMobileBottomNav } from "@/components/layout/store-mobile-bottom-nav";
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

      <StoreMobileBottomNav />

      <div className="hidden lg:block">
        <StoreFooter />
      </div>
    </div>
  );
}
