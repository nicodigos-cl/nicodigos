import type { ReactNode } from "react";
import Link from "next/link";
import { HiOutlineArrowLeft } from "react-icons/hi";

import { Logo } from "@/components/logo";
import StoreFooter from "@/components/layout/store-footer";
import StoreNav from "@/components/layout/store-nav";

export default function CheckoutLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full bg-background flex flex-col">
      <div className="hidden lg:block">
        <StoreNav />
      </div>

      <header className="fixed top-0 inset-x-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/40 py-3.5 px-4 flex items-center justify-between lg:hidden shadow-xs">
        <Link
          href="/cart"
          className="inline-flex items-center gap-1.5 p-1.5 -ml-1.5 text-sm font-medium text-foreground hover:bg-muted/80 rounded-full transition-all active:scale-90"
          aria-label="Volver al carrito"
        >
          <HiOutlineArrowLeft className="size-5" />
        </Link>
        <span className="text-base font-bold tracking-tight text-foreground">
          Checkout
        </span>
        <Logo size={28} href={false} />
      </header>

      <div className="flex-1 max-lg:pt-16">{children}</div>

      <div className="hidden lg:block">
        <StoreFooter />
      </div>
    </div>
  );
}
