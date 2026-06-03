import type { Metadata } from "next";

import { CartViewPanel } from "@/components/store/cart-view";
import { requireStoreUser } from "@/lib/store/auth";
import { getCartView } from "@/lib/store/cart/queries";

export const metadata: Metadata = {
  title: "Carrito",
};

export default async function CartPage() {
  const session = await requireStoreUser("/carrito");
  const cart = (await getCartView(session.user.id)) ?? {
    id: "",
    items: [],
    itemCount: 0,
    subtotal: "0",
  };

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 space-y-2">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
            Tu carrito
          </h1>
          <p className="text-muted-foreground">
            Revisa tus productos digitales antes de finalizar la compra.
          </p>
        </div>
        <CartViewPanel cart={cart} />
      </div>
    </main>
  );
}
