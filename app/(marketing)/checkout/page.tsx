import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CheckoutForm } from "@/components/store/checkout-form";
import { CheckoutSteps } from "@/components/store/checkout-steps";
import { getCheckoutPageData } from "@/lib/store/checkout/get-checkout-initial";
import { getCartView } from "@/lib/store/cart/queries";
import { getOptionalStoreSession } from "@/lib/store/auth";
import { storeRoutes } from "@/lib/store/navigation";
import { formatMoney } from "@/lib/currency/format";

export const metadata: Metadata = {
  title: "Checkout — Datos de compra",
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: "/checkout",
  },
};

export default async function CheckoutPage() {
  const session = await getOptionalStoreSession();

  if (!session?.user) {
    redirect(storeRoutes.cart);
  }

  const cart = await getCartView(session.user.id);

  if (!cart || cart.items.length === 0) {
    redirect(storeRoutes.cart);
  }

  const checkoutData = await getCheckoutPageData(session.user.id);

  return (
    <main className="flex-1 relative overflow-hidden bg-background">
      <div className="absolute inset-0 admin-dashboard-grid opacity-20 pointer-events-none" />

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8 relative z-10 space-y-8">
        <CheckoutSteps current="checkout" />

        <div className="space-y-2 border-b border-border/10 pb-6">
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground">
            Datos para tu compra
          </h1>
          <p className="text-sm text-muted-foreground/90 max-w-xl">
            Completa los pasos del formulario para emitir tu comprobante y
            recibir tus keys al tiro después del pago. Los datos se solicitan
            por obligaciones tributarias y de protección de datos personales en
            Chile.
          </p>
        </div>

        <CheckoutForm
          {...checkoutData}
          userId={session.user.id}
          totalLabel={formatMoney(cart.subtotal)}
          itemCount={cart.itemCount}
        />
      </div>
    </main>
  );
}
