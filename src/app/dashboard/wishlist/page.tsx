import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Wishlist · Nicodigos",
};

export default function CustomerWishlistPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Wishlist
        </h1>
        <p className="text-sm text-muted-foreground">
          Guarda productos para comprarlos más tarde.
        </p>
      </div>

      <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
        Todavía no tienes productos en tu wishlist.
      </p>
    </div>
  );
}
