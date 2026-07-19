import { redirect } from "next/navigation";

import { CartPageClient } from "@/components/store/cart-page-client";
import StoreLayout from "@/components/layout/store-layout";
import { requireSession } from "@/lib/auth/session";
import { getCartForUser } from "@/lib/cart/queries";

export default async function CartPage() {
  const session = await requireSession();
  if (!session?.user) {
    redirect("/auth/login?next=/cart");
  }

  const cart = await getCartForUser(session.user.id);
  return (
    <StoreLayout>
      <CartPageClient cart={cart} />
    </StoreLayout>
  );
}
