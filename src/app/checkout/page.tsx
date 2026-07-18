import { redirect } from "next/navigation";

import { CheckoutPageClient } from "@/components/store/checkout-page-client";
import { getSession } from "@/lib/auth/session";
import { getCartForUser } from "@/lib/cart/queries";
import { getOrderById } from "@/lib/orders/queries";

type CheckoutPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CheckoutPage({
  searchParams,
}: CheckoutPageProps) {
  const params = await searchParams;
  const orderIdRaw = params.orderId;
  const orderId = Array.isArray(orderIdRaw) ? orderIdRaw[0] : orderIdRaw;

  if (orderId) {
    const order = await getOrderById(orderId);
    if (!order) {
      redirect("/cart");
    }
    return (
      <CheckoutPageClient
        mode="order"
        order={order}
        defaultEmail={order.email}
        defaultName={order.customerName ?? order.userName}
      />
    );
  }

  const session = await getSession();
  if (!session?.user) {
    redirect("/auth/login?next=/checkout");
  }

  const cart = await getCartForUser(session.user.id);
  if (!cart || cart.items.length === 0) {
    redirect("/cart");
  }

  return (
    <CheckoutPageClient
      mode="cart"
      cart={cart}
      defaultEmail={session.user.email}
      defaultName={session.user.name}
    />
  );
}
