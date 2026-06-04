import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { getStoreCounts } from "@/lib/store/cart/queries";
import { getOptionalStoreSession } from "@/lib/store/auth";

export async function MarketingMobileNav() {
  const session = await getOptionalStoreSession();

  if (!session?.user) {
    return (
      <MobileBottomNav
        cartCount={0}
        isAuthenticated={false}
      />
    );
  }

  const counts = await getStoreCounts(session.user.id);

  return (
    <MobileBottomNav
      cartCount={counts.cart}
      isAuthenticated={true}
    />
  );
}
