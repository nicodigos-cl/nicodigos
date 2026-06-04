"use client";

import { useTransition } from "react";
import Link from "next/link";
import { FiShoppingCart, FiTrash2 } from "react-icons/fi";
import { LuArrowRightLeft } from "react-icons/lu";
import { toast } from "sonner";

import { CheckoutButton } from "@/components/store/checkout-button";
import { StoreProductCover } from "@/components/store/store-product-cover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
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

export function CartViewPanel({ cart }: CartViewProps) {
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
      <Card className="border-2 border-dashed border-border/60 bg-card/60 backdrop-blur-md p-8 sm:p-12 text-center max-w-lg mx-auto rounded-3xl shadow-sm space-y-6">
        <CardContent className="flex flex-col items-center justify-center p-0 space-y-5">
          <div className="relative p-4 rounded-full bg-primary/5 text-primary border border-primary/10">
            <FiShoppingCart className="size-10" />
            <div className="absolute -top-1 -right-1 size-3 rounded-full bg-primary animate-ping" />
            <div className="absolute -top-1 -right-1 size-3 rounded-full bg-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="font-heading text-xl font-bold text-foreground">Tu carrito está vacío</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              Explora nuestro catálogo completo de keys oficiales, tarjetas de regalo y licencias de software con activación inmediata.
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
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      <div className="space-y-4">
        {/* Bulk Action Header */}
        <div className="flex items-center justify-between border-b border-border/10 pb-3">
          <span className="text-xs text-muted-foreground font-medium">
            Tienes <span className="font-semibold text-foreground">{cart.items.length}</span> {cart.items.length === 1 ? "producto" : "productos"} en tu lista
          </span>
          <Button
            type="button"
            variant="ghost"
            disabled={isPending}
            onClick={handleClear}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors h-7 px-2.5 rounded-lg"
          >
            <FiTrash2 className="size-3.5 mr-1" />
            Vaciar todo
          </Button>
        </div>

        <ul className="space-y-4">
          {cart.items.map((item) => (
            <li key={item.id}>
              <Card className="glass-card overflow-hidden hover:border-primary/20 transition-colors duration-300">
                <CardContent className="flex flex-col sm:flex-row gap-5 p-5">
                  <Link
                    href={storeRoutes.product(item.product.slug)}
                    className="shrink-0 relative rounded-xl overflow-hidden aspect-[16/10] sm:aspect-square w-full sm:size-28 bg-muted/20 border border-border/50"
                  >
                    <StoreProductCover
                      src={item.product.coverImageUrl}
                      alt={item.product.name}
                      className="w-full h-full object-cover rounded-none transition-transform duration-500 hover:scale-105"
                      sizes="112px"
                    />
                  </Link>

                  <div className="flex min-w-0 flex-1 flex-col justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="font-semibold text-[10px] tracking-wider uppercase">{item.product.platform}</Badge>
                        {!item.product.isActive || item.product.qty <= 0 ? (
                          <Badge variant="destructive" className="font-semibold text-[10px] tracking-wider uppercase">Sin stock</Badge>
                        ) : null}
                      </div>
                      <Link
                        href={storeRoutes.product(item.product.slug)}
                        className="line-clamp-2 text-sm font-extrabold text-foreground hover:text-primary transition-colors leading-snug"
                      >
                        {item.product.name}
                      </Link>
                      <p className="text-xs text-muted-foreground font-medium">
                        Oferta: {item.offer.name}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border/30 pt-3">
                      <div className="flex items-center gap-2">
                        <label
                          htmlFor={`qty-${item.id}`}
                          className="text-xs font-semibold text-muted-foreground"
                        >
                          Cantidad:
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
                          className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
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
                        <p className="text-base font-black text-foreground tabular-nums">
                          {formatMoney(item.lineTotal)}
                        </p>
                        <p className="text-[10px] text-muted-foreground/80 font-medium font-mono">
                          {formatMoney(item.unitPrice)} c/u
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 border-t border-border/20 pt-2.5">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isPending}
                        onClick={() => handleMoveToWishlist(item.id)}
                        className="text-xs h-8 px-3 rounded-lg"
                      >
                        <LuArrowRightLeft className="size-3.5 mr-1" />
                        Guardar para después
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={isPending}
                        onClick={() => handleRemove(item.id)}
                        className="text-xs text-muted-foreground hover:text-destructive h-8 px-3 rounded-lg"
                      >
                        <FiTrash2 className="size-3.5 mr-1" />
                        Quitar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </div>

      {/* Sticky Total summary box */}
      <Card className="h-fit glass-card lg:sticky lg:top-24 overflow-hidden border border-border/80 shadow-md">
        <div className="bg-gradient-to-r from-primary/5 via-transparent to-primary/5 px-6 py-4 border-b border-border/40">
          <CardTitle className="font-heading text-lg font-bold">Resumen de Compra</CardTitle>
        </div>
        <CardContent className="p-6 space-y-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground font-medium">Productos seleccionados</span>
            <span className="font-bold text-foreground">{cart.itemCount}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground font-medium">Envío</span>
            <span className="text-emerald-500 font-bold uppercase text-[10px] tracking-wider bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">Instantáneo</span>
          </div>
          <Separator className="bg-border/40" />
          <div className="flex items-center justify-between text-base">
            <span className="font-bold text-foreground">Total a pagar</span>
            <span className="font-black text-lg text-primary tabular-nums">{formatMoney(cart.subtotal)}</span>
          </div>
          
          <div className="rounded-xl bg-muted/40 p-3.5 border border-border/30 space-y-1.5 text-xs text-muted-foreground/90 leading-relaxed">
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Entrega Digital Automática
            </div>
            Las licencias y códigos se envían de forma instantánea a tu correo y cuenta una vez verificado el pago.
          </div>
        </CardContent>
        <CardFooter className="p-6 pt-0 flex flex-col gap-3">
          <CheckoutButton className="w-full h-11 text-sm font-bold shadow-md hover:scale-[1.01] active:scale-[0.99] transition-transform duration-200" disabled={isPending} />
        </CardFooter>
      </Card>
    </div>
  );
}
