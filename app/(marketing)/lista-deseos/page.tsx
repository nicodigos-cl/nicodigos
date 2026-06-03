import type { Metadata } from "next";

import { WishlistViewPanel } from "@/components/store/wishlist-view";
import { requireStoreUser } from "@/lib/store/auth";
import { getWishlistView } from "@/lib/store/wishlist/queries";

export const metadata: Metadata = {
  title: "Lista de deseos",
};

export default async function WishlistPage() {
  const session = await requireStoreUser("/lista-deseos");
  const wishlist = (await getWishlistView(session.user.id)) ?? {
    id: "",
    items: [],
    itemCount: 0,
  };

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 space-y-2">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
            Lista de deseos
          </h1>
          <p className="text-muted-foreground">
            Productos guardados para comprar cuando quieras.
          </p>
        </div>
        <WishlistViewPanel wishlist={wishlist} />
      </div>
    </main>
  );
}
