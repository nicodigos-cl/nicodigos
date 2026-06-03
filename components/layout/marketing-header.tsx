import { MarketplaceHeader } from "@/components/layout/header";
import { getCartView, getStoreCounts } from "@/lib/store/cart/queries";
import { getOptionalStoreSession } from "@/lib/store/auth";

export async function MarketingHeader() {
  const session = await getOptionalStoreSession();

  if (!session?.user) {
    return (
      <MarketplaceHeader
        cart={null}
        cartCount={0}
        wishlistCount={0}
        isAuthenticated={false}
      />
    );
  }

  const [counts, cart] = await Promise.all([
    getStoreCounts(session.user.id),
    getCartView(session.user.id),
  ]);

  return (
    <MarketplaceHeader
      cart={cart}
      cartCount={counts.cart}
      wishlistCount={counts.wishlist}
      isAuthenticated
      user={{
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      }}
    />
  );
}
