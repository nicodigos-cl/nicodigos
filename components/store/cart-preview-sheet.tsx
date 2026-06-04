"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiShoppingCart, FiTrash2 } from "react-icons/fi";
import { toast } from "sonner";

import { CheckoutButton } from "@/components/store/checkout-button";
import { StoreProductCover } from "@/components/store/store-product-cover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { formatMoney } from "@/lib/currency/format";
import { playSound } from "@/lib/sounds";
import {
  removeCartItemAction,
  updateCartItemQuantityAction,
} from "@/lib/store/cart/actions";
import { storeRoutes } from "@/lib/store/navigation";
import type { CartView } from "@/lib/store/types";

type CartPreviewSheetProps = {
  cart: CartView | null;
  cartCount: number;
  isAuthenticated: boolean;
};

export function CartPreviewSheet({
  cart,
  cartCount,
  isAuthenticated,
}: CartPreviewSheetProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const items = cart?.items ?? [];
  const subtotal = cart?.subtotal ?? "0";
  const itemCount = cart?.itemCount ?? cartCount;

  function refresh(message?: string) {
    if (message) {
      playSound("notification");
      toast.success(message);
    }
    router.refresh();
  }

  function handleQuantityChange(itemId: string, quantity: number) {
    startTransition(async () => {
      const result = await updateCartItemQuantityAction(itemId, quantity);
      if (!result.success) {
        playSound("caution");
        toast.error(result.error);
        return;
      }
      refresh(result.message);
    });
  }

  function handleRemove(itemId: string) {
    startTransition(async () => {
      const result = await removeCartItemAction(itemId);
      if (!result.success) {
        playSound("caution");
        toast.error(result.error);
        return;
      }
      refresh(result.message);
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative shrink-0"
          aria-label="Ver carrito"
        >
          <FiShoppingCart className="size-5" aria-hidden />
          {cartCount > 0 ? (
            <Badge className="absolute -top-1 -right-1 size-5 justify-center rounded-full px-0 text-[10px]">
              {cartCount > 9 ? "9+" : cartCount}
            </Badge>
          ) : null}
        </Button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="flex w-full max-w-md flex-col gap-0 p-0 sm:max-w-sm"
      >
        <SheetHeader className="border-b border-border px-4 py-4 text-left">
          <SheetTitle className="font-heading text-lg">
            Tu carrito
            {itemCount > 0 ? (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({itemCount})
              </span>
            ) : null}
          </SheetTitle>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col">
          {!isAuthenticated ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
              <p className="text-sm text-muted-foreground">
                Inicia sesión para guardar productos y ver tu carrito.
              </p>
              <Button asChild onClick={() => setOpen(false)}>
                <Link
                  href={`${storeRoutes.signIn}?callbackUrl=${encodeURIComponent(storeRoutes.cart)}`}
                >
                  Iniciar sesión
                </Link>
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
              <p className="text-sm text-muted-foreground">
                Tu carrito está vacío. Explora el catálogo y agrega productos.
              </p>
              <Button asChild onClick={() => setOpen(false)}>
                <Link href={storeRoutes.catalog}>Ver catálogo</Link>
              </Button>
            </div>
          ) : (
            <>
              <ul className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="flex gap-3 rounded-xl border border-border/60 bg-card p-3"
                  >
                    <Link
                      href={storeRoutes.product(item.product.slug)}
                      onClick={() => setOpen(false)}
                      className="shrink-0"
                    >
                      <StoreProductCover
                        src={item.product.coverImageUrl}
                        alt={item.product.name}
                        className="size-16"
                        sizes="64px"
                      />
                    </Link>

                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <div className="min-w-0">
                        <Link
                          href={storeRoutes.product(item.product.slug)}
                          onClick={() => setOpen(false)}
                          className="line-clamp-2 text-sm font-semibold text-foreground hover:text-primary"
                        >
                          {item.product.name}
                        </Link>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatMoney(item.lineTotal)}
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <select
                          value={item.quantity}
                          disabled={isPending}
                          onChange={(event) =>
                            handleQuantityChange(
                              item.id,
                              Number(event.target.value),
                            )
                          }
                          className="h-8 rounded-lg border border-border bg-background px-2 text-xs"
                          aria-label={`Cantidad de ${item.product.name}`}
                        >
                          {Array.from({ length: 10 }, (_, i) => i + 1).map(
                            (value) => (
                              <option key={value} value={value}>
                                {value}
                              </option>
                            ),
                          )}
                        </select>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          disabled={isPending}
                          onClick={() => handleRemove(item.id)}
                          aria-label={`Quitar ${item.product.name}`}
                        >
                          <FiTrash2 aria-hidden />
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-auto border-t border-border bg-background px-4 py-4">
                <div className="mb-4 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-base font-semibold text-foreground">
                    {formatMoney(subtotal)}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <CheckoutButton
                    className="w-full"
                    disabled={isPending}
                    onStarted={() => setOpen(false)}
                  />
                  <Button
                    variant="outline"
                    className="w-full"
                    asChild
                    onClick={() => setOpen(false)}
                  >
                    <Link href={storeRoutes.cart}>Ver carrito completo</Link>
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
