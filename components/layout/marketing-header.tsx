import { MarketplaceHeader } from "@/components/layout/header";
import { getStoreCounts } from "@/lib/store/cart/queries";
import { getOptionalStoreSession } from "@/lib/store/auth";

export async function MarketingHeader() {
  const session = await getOptionalStoreSession();
  const counts = session?.user
    ? await getStoreCounts(session.user.id)
    : { cart: 0, wishlist: 0 };

  return (
    <MarketplaceHeader
      cartCount={counts.cart}
      wishlistCount={counts.wishlist}
      isAuthenticated={Boolean(session?.user)}
    />
  );
}
