import type { ReactNode } from "react";
import StoreFooter from "@/components/layout/store-footer";
import StoreNav from "@/components/layout/store-nav";

export default function CheckoutLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full bg-background flex flex-col">
      <StoreNav />
      <div className="flex-1">
        {children}
      </div>
      <StoreFooter />
    </div>
  );
}
