import { CartPageClient } from "@/components/store/cart-page-client";
import StoreLayout from "@/components/layout/store-layout";
import { getSession } from "@/lib/auth/session";
import { getCurrentCart } from "@/lib/cart/current";

export default async function CartPage() {
  const session = await getSession();
  const cart = await getCurrentCart(session?.user.id);
  return (
    <StoreLayout>
      <CartPageClient cart={cart} />
    </StoreLayout>
  );
}
