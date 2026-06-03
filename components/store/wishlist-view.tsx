"use client";

import { useTransition } from "react";
import Link from "next/link";
import { FiShoppingCart, FiTrash2 } from "react-icons/fi";
import { toast } from "sonner";

import { StoreProductCover } from "@/components/store/store-product-cover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <Card className="border border-dashed border-border bg-card">
        <CardHeader>
          <CardTitle>Tu lista está vacía</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>Guarda productos para comprarlos más tarde con un clic.</p>
          <Button asChild>
            <Link href={storeRoutes.home}>Explorar productos</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {wishlist.itemCount} producto{wishlist.itemCount === 1 ? "" : "s"}{" "}
          guardado{wishlist.itemCount === 1 ? "" : "s"}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={handleClear}
        >
          Vaciar lista
        </Button>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {wishlist.items.map((item) => (
          <li key={item.id}>
            <Card size="sm" className="h-full border border-border/60 bg-card">
              <CardContent className="flex h-full flex-col gap-3 p-4">
                <Link href={storeRoutes.product(item.product.slug)}>
                  <StoreProductCover
                    src={item.product.coverImageUrl}
                    alt={item.product.name}
                    className="aspect-16/10 w-full"
                    sizes="(max-width:640px) 100vw, 320px"
                  />
                </Link>

                <div className="flex flex-1 flex-col gap-2">
                  <Badge variant="secondary" className="w-fit">
                    {item.product.platform}
                  </Badge>
                  <Link
                    href={storeRoutes.product(item.product.slug)}
                    className="line-clamp-2 text-sm font-semibold text-foreground hover:text-primary"
                  >
                    {item.product.name}
                  </Link>
                  <p className="text-sm font-semibold text-foreground">
                    {formatMoney(item.product.sellPrice)}
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    className="w-full"
                    disabled={
                      isPending ||
                      !item.product.isActive ||
                      item.product.qty <= 0
                    }
                    onClick={() => handleAddToCart(item.id)}
                  >
                    <FiShoppingCart aria-hidden />
                    Agregar al carrito
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    disabled={isPending}
                    onClick={() => handleRemove(item.id)}
                  >
                    <FiTrash2 aria-hidden />
                    Quitar
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
