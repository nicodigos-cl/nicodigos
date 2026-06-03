"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { FiShoppingCart, FiTrash2 } from "react-icons/fi";
import { LuArrowRightLeft } from "react-icons/lu";
import { toast } from "sonner";

import { StoreProductCover } from "@/components/store/store-product-cover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  clearCartAction,
  moveCartItemToWishlistAction,
  removeCartItemAction,
  updateCartItemQuantityAction,
} from "@/lib/store/cart/actions";
import type { CartView } from "@/lib/store/types";
import { storeRoutes } from "@/lib/store/navigation";
import { formatMoney } from "@/lib/currency/format";

type CartViewProps = {
  cart: CartView;
};

export function CartViewPanel({ cart: initialCart }: CartViewProps) {
  const [cart, setCart] = useState(initialCart);
  const [isPending, startTransition] = useTransition();

  function refreshFromAction(message?: string) {
    if (message) toast.success(message);
    startTransition(() => {
      window.location.reload();
    });
  }

  function handleQuantityChange(itemId: string, quantity: number) {
    startTransition(async () => {
      const result = await updateCartItemQuantityAction(itemId, quantity);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      refreshFromAction(result.message);
    });
  }

  function handleRemove(itemId: string) {
    startTransition(async () => {
      const result = await removeCartItemAction(itemId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      refreshFromAction(result.message);
    });
  }

  function handleMoveToWishlist(itemId: string) {
    startTransition(async () => {
      const result = await moveCartItemToWishlistAction(itemId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      refreshFromAction(result.message);
    });
  }

  function handleClear() {
    startTransition(async () => {
      const result = await clearCartAction();
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      refreshFromAction(result.message);
    });
  }

  if (cart.items.length === 0) {
    return (
      <Card className="border border-dashed border-border bg-card">
        <CardHeader>
          <CardTitle>Tu carrito está vacío</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>Explora el catálogo y agrega keys, gift cards o licencias.</p>
          <Button asChild>
            <Link href={storeRoutes.home}>Explorar productos</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <ul className="space-y-3">
        {cart.items.map((item) => (
          <li key={item.id}>
            <Card size="sm" className="border border-border/60 bg-card">
              <CardContent className="flex gap-4 p-4">
                <Link
                  href={storeRoutes.product(item.product.slug)}
                  className="shrink-0"
                >
                  <StoreProductCover
                    src={item.product.coverImageUrl}
                    alt={item.product.name}
                    className="size-24 sm:size-28"
                    sizes="112px"
                  />
                </Link>

                <div className="flex min-w-0 flex-1 flex-col gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{item.product.platform}</Badge>
                      {!item.product.isActive || item.product.qty <= 0 ? (
                        <Badge variant="destructive">Sin stock</Badge>
                      ) : null}
                    </div>
                    <Link
                      href={storeRoutes.product(item.product.slug)}
                      className="line-clamp-2 text-sm font-semibold text-foreground hover:text-primary"
                    >
                      {item.product.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {item.offer.name}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor={`qty-${item.id}`}
                        className="text-xs text-muted-foreground"
                      >
                        Cant.
                      </label>
                      <select
                        id={`qty-${item.id}`}
                        value={item.quantity}
                        disabled={isPending}
                        onChange={(event) =>
                          handleQuantityChange(
                            item.id,
                            Number(event.target.value),
                          )
                        }
                        className="h-8 rounded-xl border border-border bg-background px-2 text-sm"
                      >
                        {Array.from(
                          { length: 10 },
                          (_, index) => index + 1,
                        ).map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">
                        {formatMoney(item.lineTotal)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatMoney(item.unitPrice)} c/u
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleMoveToWishlist(item.id)}
                    >
                      <LuArrowRightLeft aria-hidden />
                      Guardar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleRemove(item.id)}
                    >
                      <FiTrash2 aria-hidden />
                      Quitar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>

      <Card className="h-fit border border-border/60 bg-card lg:sticky lg:top-24">
        <CardHeader>
          <CardTitle>Resumen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Productos</span>
            <span>{cart.itemCount}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between text-base font-semibold">
            <span>Subtotal</span>
            <span>{formatMoney(cart.subtotal)}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Entrega digital. El pago se habilitará próximamente.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button className="w-full" disabled>
            Finalizar compra
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={isPending}
            onClick={handleClear}
          >
            Vaciar carrito
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
