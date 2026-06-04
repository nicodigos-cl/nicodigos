"use client";

import { useTransition } from "react";
import Link from "next/link";
import { FiShoppingCart, FiTrash2 } from "react-icons/fi";
import { IconHeart } from "@tabler/icons-react";
import { toast } from "sonner";

import { StoreProductCover } from "@/components/store/store-product-cover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/currency/format";
import {
  addWishlistItemToCartAction,
  clearWishlistAction,
  removeWishlistItemAction,
} from "@/lib/store/wishlist/actions";
import { storeRoutes } from "@/lib/store/navigation";
import type { WishlistView } from "@/lib/store/types";

type WishlistViewProps = {
  wishlist: WishlistView;
};

export function WishlistViewPanel({ wishlist }: WishlistViewProps) {
  const [isPending, startTransition] = useTransition();

  function reload(message?: string) {
    if (message) toast.success(message);
    startTransition(() => {
      window.location.reload();
    });
  }

  function handleRemove(itemId: string) {
    startTransition(async () => {
      const result = await removeWishlistItemAction(itemId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      reload(result.message);
    });
  }

  function handleAddToCart(itemId: string) {
    startTransition(async () => {
      const result = await addWishlistItemToCartAction(itemId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      reload(result.message);
    });
  }

  function handleClear() {
    startTransition(async () => {
      const result = await clearWishlistAction();
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      reload(result.message);
    });
  }

  if (wishlist.items.length === 0) {
    return (
      <Card className="border-2 border-dashed border-border/60 bg-card/60 backdrop-blur-md p-8 sm:p-12 text-center max-w-lg mx-auto rounded-3xl shadow-sm space-y-6">
        <CardContent className="flex flex-col items-center justify-center p-0 space-y-5">
          <div className="relative p-4 rounded-full bg-rose-500/5 text-rose-500 border border-rose-500/10">
            <IconHeart className="size-10 text-rose-500 animate-pulse" />
            <div className="absolute -top-1 -right-1 size-3 rounded-full bg-rose-500 animate-ping" />
            <div className="absolute -top-1 -right-1 size-3 rounded-full bg-rose-500" />
          </div>
          <div className="space-y-2">
            <h2 className="font-heading text-xl font-bold text-foreground">Tu lista de deseos está vacía</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              Explora y guarda tus productos favoritos para comprarlos más tarde con un solo clic.
            </p>
          </div>
          <Button asChild size="lg" className="w-full sm:w-auto font-semibold px-6 shadow-sm">
            <Link href={storeRoutes.catalog}>Explorar productos</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/10 pb-4">
        <p className="text-xs text-muted-foreground font-medium">
          Tienes <span className="font-semibold text-foreground">{wishlist.itemCount}</span> producto{wishlist.itemCount === 1 ? "" : "s"} guardado{wishlist.itemCount === 1 ? "" : "s"}
        </p>
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={handleClear}
          className="text-xs h-8 px-3 rounded-lg hover:text-destructive hover:border-destructive/40 transition-colors"
        >
          Vaciar lista
        </Button>
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
        {wishlist.items.map((item) => (
          <li key={item.id}>
            <Card className="h-full glass-card overflow-hidden hover:border-rose-500/20 transition-all duration-300">
              <CardContent className="flex h-full flex-col gap-3 p-3 sm:gap-4 sm:p-5">
                <Link
                  href={storeRoutes.product(item.product.slug)}
                  className="relative overflow-hidden block aspect-[4/3] sm:aspect-[16/10] bg-muted/20 border border-border/50 rounded-xl"
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 pointer-events-none" />
                  <StoreProductCover
                    src={item.product.coverImageUrl}
                    alt={item.product.name}
                    className="w-full h-full object-cover rounded-none transition-transform duration-500 hover:scale-105"
                    sizes="(max-width:640px) 100vw, 320px"
                  />
                </Link>

                <div className="flex flex-1 flex-col gap-1.5 sm:gap-2">
                  <Badge variant="secondary" className="w-fit font-bold text-[8px] sm:text-[10px] tracking-wider uppercase px-1.5 py-0">
                    {item.product.platform}
                  </Badge>
                  <Link
                    href={storeRoutes.product(item.product.slug)}
                    className="line-clamp-2 text-xs sm:text-sm font-extrabold text-foreground hover:text-primary transition-colors leading-snug"
                  >
                    {item.product.name}
                  </Link>
                  <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between mt-auto pt-2 border-t border-border/30 gap-1">
                    <span className="hidden sm:inline text-xs text-muted-foreground/80 font-medium">Precio</span>
                    <p className="text-sm sm:text-base font-extrabold text-foreground tabular-nums">
                      {formatMoney(item.product.sellPrice)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 pt-2 border-t border-border/10">
                  <Button
                    type="button"
                    disabled={
                      isPending ||
                      !item.product.isActive ||
                      item.product.qty <= 0
                    }
                    onClick={() => handleAddToCart(item.id)}
                    className="flex-1 h-9 text-xs font-bold shadow-sm px-2"
                  >
                    <FiShoppingCart className="size-3.5 mr-1 shrink-0" />
                    <span className="truncate">Añadir</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={isPending}
                    onClick={() => handleRemove(item.id)}
                    className="size-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                    aria-label="Quitar de la lista de deseos"
                  >
                    <FiTrash2 className="size-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
