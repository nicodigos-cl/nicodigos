import type { Metadata } from "next";
import { WishlistViewPanel } from "@/components/store/wishlist-view";
import { requireStoreUser } from "@/lib/store/auth";
import { getWishlistView } from "@/lib/store/wishlist/queries";
import { storeRoutes } from "@/lib/store/navigation";
import { IconHeart } from "@tabler/icons-react";

export const metadata: Metadata = {
  title: "Lista de deseos",
};

export default async function WishlistPage() {
  const session = await requireStoreUser(storeRoutes.wishlist);
  const wishlist = (await getWishlistView(session.user.id)) ?? {
    id: "",
    items: [],
    itemCount: 0,
  };

  return (
    <main className="flex-1 relative overflow-hidden bg-background">
      {/* Decorative background elements and rose-tinted orbs */}
      <div className="absolute inset-0 admin-dashboard-grid opacity-20 pointer-events-none" />
      <div className="absolute top-[-10%] right-[-10%] -z-10 h-[500px] w-[500px] rounded-full bg-rose-500/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-15%] left-[-10%] -z-10 h-[450px] w-[450px] rounded-full bg-pink-500/5 blur-[120px] pointer-events-none" />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 relative z-10 space-y-8">
        <div className="border-b border-border/10 pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 shadow-inner">
                <IconHeart className="size-5 text-rose-500" />
              </div>
              <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground bg-gradient-to-r from-foreground to-rose-500 bg-clip-text">
                Lista de Deseos
              </h1>
            </div>
            <p className="text-sm text-muted-foreground/90">
              Guarda tus productos favoritos para comprarlos o darles seguimiento más tarde.
            </p>
          </div>
        </div>

        <div className="relative z-20">
          <WishlistViewPanel wishlist={wishlist} />
        </div>
      </div>
    </main>
  );
}
