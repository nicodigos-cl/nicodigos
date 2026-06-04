"use client";

import { useState, useTransition } from "react";
import { FiHeart, FiShoppingCart } from "react-icons/fi";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { addToCartAction } from "@/lib/store/cart/actions";
import { playSound } from "@/lib/sounds";
import { toggleWishlistAction } from "@/lib/store/wishlist/actions";
import { cn } from "@/lib/utils";

type ProductStoreActionsProps = {
  productId: string;
  inWishlist?: boolean;
  disabled?: boolean;
  className?: string;
  compact?: boolean;
  /** Dos botones anchos en grilla (página de producto). */
  split?: boolean;
};

export function ProductStoreActions({
  productId,
  inWishlist = false,
  disabled = false,
  className,
  compact = false,
  split = false,
}: ProductStoreActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(inWishlist);

  function handleAddToCart() {
    startTransition(async () => {
      const result = await addToCartAction(productId, 1);
      if (!result.success) {
        playSound("caution");
        toast.error(result.error);
        return;
      }
      playSound("notification");
      toast.success(result.message ?? "Agregado al carrito.");
    });
  }

  function handleToggleWishlist() {
    startTransition(async () => {
      const result = await toggleWishlistAction(productId);
      if (!result.success) {
        playSound("caution");
        toast.error(result.error);
        return;
      }
      setSaved(result.data?.inWishlist ?? !saved);
      playSound(result.data?.inWishlist ? "toggleOn" : "toggleOff");
      toast.success(result.message);
    });
  }

  return (
    <div
      className={cn(
        split ? "grid w-full grid-cols-1 gap-4 sm:grid-cols-2" : "flex gap-2",
        !split && (compact ? "flex-col" : "flex-row flex-wrap"),
        split && "[&_button]:min-h-11 [&_button]:w-full",
        className,
      )}
    >
      <Button
        type="button"
        size={compact ? "sm" : "default"}
        className={cn(
          "font-bold rounded-xl transition-all duration-200 active:scale-[0.98]",
          compact ? "w-full" : undefined,
        )}
        disabled={disabled || isPending}
        onClick={handleAddToCart}
      >
        <FiShoppingCart className="size-4 shrink-0" aria-hidden />
        {compact ? "Al carro" : "Agregar al carro"}
      </Button>
      <Button
        type="button"
        variant={saved ? "secondary" : "outline"}
        size={compact ? "sm" : "default"}
        className={cn(
          "font-bold rounded-xl transition-all duration-200 active:scale-[0.98]",
          compact ? "w-full" : undefined,
        )}
        disabled={disabled || isPending}
        onClick={handleToggleWishlist}
      >
        <FiHeart
          className={cn("size-4 shrink-0", saved ? "fill-current" : undefined)}
          aria-hidden
        />
        {saved ? "Guardado" : "Guardar"}
      </Button>
    </div>
  );
}
