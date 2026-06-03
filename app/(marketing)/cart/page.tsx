import type { Metadata } from "next";
import { CartViewPanel } from "@/components/store/cart-view";
import { requireStoreUser } from "@/lib/store/auth";
import { getCartView } from "@/lib/store/cart/queries";
import { storeRoutes } from "@/lib/store/navigation";
import { IconShoppingCart } from "@tabler/icons-react";

export const metadata: Metadata = {
  title: "Carrito",
};

export default async function CartPage() {
  const session = await requireStoreUser(storeRoutes.cart);
  const cart = (await getCartView(session.user.id)) ?? {
    id: "",
    items: [],
    itemCount: 0,
    subtotal: "0",
  };

  return (
    <main className="flex-1 relative overflow-hidden bg-background">
      {/* Decorative background elements and glowing orbs */}
      <div className="absolute inset-0 admin-dashboard-grid opacity-20 pointer-events-none" />
      <div className="absolute top-[-10%] right-[-10%] -z-10 h-[500px] w-[500px] rounded-full bg-primary/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] -z-10 h-[400px] w-[400px] rounded-full bg-indigo-500/10 blur-[110px] pointer-events-none" />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 relative z-10 space-y-8">
        
        {/* Step Progress Tracker */}
        <div className="mx-auto max-w-3xl pb-2">
          <div className="flex items-center justify-between relative">
            {/* Background line */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-border/40 z-0" />
            
            {/* Step 1: Cart */}
            <div className="relative z-10 flex flex-col items-center gap-2 bg-background px-4">
              <div className="size-8 rounded-full bg-primary text-primary-foreground font-extrabold flex items-center justify-center text-sm shadow-md ring-4 ring-primary/20">
                1
              </div>
              <span className="text-xs font-bold text-foreground">Carrito</span>
            </div>

            {/* Step 2: Payment */}
            <div className="relative z-10 flex flex-col items-center gap-2 bg-background px-4">
              <div className="size-8 rounded-full bg-muted text-muted-foreground border border-border/80 font-bold flex items-center justify-center text-sm">
                2
              </div>
              <span className="text-xs font-medium text-muted-foreground">Pago Flow</span>
            </div>

            {/* Step 3: Confirmation */}
            <div className="relative z-10 flex flex-col items-center gap-2 bg-background px-4">
              <div className="size-8 rounded-full bg-muted text-muted-foreground border border-border/80 font-bold flex items-center justify-center text-sm">
                3
              </div>
              <span className="text-xs font-medium text-muted-foreground">Confirmación</span>
            </div>
          </div>
        </div>

        <div className="border-b border-border/10 pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-inner">
                <IconShoppingCart className="size-5" />
              </div>
              <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
                Tu Carrito
              </h1>
            </div>
            <p className="text-sm text-muted-foreground/90">
              Revisa y gestiona tus productos digitales seleccionados antes de proceder al pago.
            </p>
          </div>
        </div>

        <div className="relative z-20">
          <CartViewPanel cart={cart} />
        </div>
      </div>
    </main>
  );
}
