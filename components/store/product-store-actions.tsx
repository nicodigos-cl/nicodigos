"use client";

import { useState, useTransition } from "react";
import { FiHeart, FiShoppingCart } from "react-icons/fi";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { addToCartAction } from "@/lib/store/cart/actions";
import { toggleWishlistAction } from "@/lib/store/wishlist/actions";
import { cn } from "@/lib/utils";

type ProductStoreActionsProps = {
  productId: string;
  inWishlist?: boolean;
  disabled?: boolean;
  className?: string;
  compact?: boolean;
};

export function ProductStoreActions({
  productId,
  inWishlist = false,
  disabled = false,
  className,
  compact = false,
}: ProductStoreActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(inWishlist);

  function handleAddToCart() {
    startTransition(async () => {
      const result = await addToCartAction(productId, 1);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Agregado al carrito.");
    });
  }

  function handleToggleWishlist() {
    startTransition(async () => {
      const result = await toggleWishlistAction(productId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setSaved(result.data?.inWishlist ?? !saved);
      toast.success(result.message);
    });
  }

  return (
    <div
      className={cn(
        "flex gap-2",
        compact ? "flex-col" : "flex-row flex-wrap",
        className,
      )}
    >
      <Button
        type="button"
        size={compact ? "sm" : "default"}
        className={compact ? "w-full" : undefined}
        disabled={disabled || isPending}
        onClick={handleAddToCart}
      >
        <FiShoppingCart aria-hidden />
        Carrito
      </Button>
      <Button
        type="button"
        variant={saved ? "secondary" : "outline"}
        size={compact ? "sm" : "default"}
        className={compact ? "w-full" : undefined}
        disabled={disabled || isPending}
        onClick={handleToggleWishlist}
      >
        <FiHeart aria-hidden className={saved ? "fill-current" : undefined} />
        {saved ? "Guardado" : "Deseos"}
      </Button>
    </div>
  );
}
