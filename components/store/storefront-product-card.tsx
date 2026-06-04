import Link from "next/link";
import { IconBolt, IconClock } from "@tabler/icons-react";

import { ProductStoreActions } from "@/components/store/product-store-actions";
import { StoreProductCover } from "@/components/store/store-product-cover";
import { PlatformBadge } from "@/components/store/platform-badge";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatMoney } from "@/lib/currency/format";
import { storeRoutes } from "@/lib/store/navigation";
import type { StorefrontProductCard } from "@/lib/store/home/types";
import { cn } from "@/lib/utils";

type StorefrontProductCardProps = {
  product: StorefrontProductCard;
  className?: string;
};

export function StorefrontProductCardView({
  product,
  className,
}: StorefrontProductCardProps) {
  const inStock = product.qty > 0 || product.isPreorder;
  const displayPrice = product.offer?.sellPrice ?? product.sellPrice;

  return (
    <Card
      size="sm"
      className={cn(
        "group relative h-full gap-0 overflow-hidden py-0 ring-border/40 transition-all duration-300 hover:ring-primary/30",
        className,
      )}
    >
      {product.isOffer && product.discountPercent ? (
        <Badge className="absolute right-3 top-3 z-20 border-0 bg-rose-500 font-bold text-white shadow-md">
          -{product.discountPercent}%
        </Badge>
      ) : null}
      {product.isPreorder ? (
        <Badge
          variant="outline"
          className="absolute left-3 top-3 z-20 border-violet-500/30 bg-violet-500/10 text-violet-400"
        >
          <IconClock className="size-3" aria-hidden />
          Preventa
        </Badge>
      ) : null}

      <Link
        href={storeRoutes.product(product.slug)}
        className="relative block aspect-16/10 overflow-hidden bg-muted/30"
      >
        <StoreProductCover
          src={product.coverImageUrl}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width:640px) 100vw, 280px"
        />
      </Link>

      <CardHeader className="gap-2 px-4 pt-4 pb-0">
        <PlatformBadge platform={product.platform} />
        <CardTitle className="line-clamp-2 min-h-[2.5rem] text-sm font-extrabold leading-snug">
          <Link
            href={storeRoutes.product(product.slug)}
            className="hover:text-primary transition-colors"
          >
            {product.name}
          </Link>
        </CardTitle>
        {product.genres.length > 0 ? (
          <p className="line-clamp-1 text-xs text-muted-foreground">
            {product.genres.slice(0, 2).join(" · ")}
          </p>
        ) : null}
      </CardHeader>

      <CardContent className="px-4 pt-3 pb-0">
        <div className="flex items-end justify-between gap-2 border-t border-border/40 pt-3">
          <div className="min-w-0">
            {product.listPrice ? (
              <p className="text-xs text-muted-foreground line-through tabular-nums">
                {formatMoney(product.listPrice)}
              </p>
            ) : null}
            <p className="text-base font-black tabular-nums text-foreground">
              {formatMoney(displayPrice)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Stock
            </p>
            <p
              className={cn(
                "text-xs font-bold tabular-nums",
                inStock ? "text-emerald-500" : "text-muted-foreground",
              )}
            >
              {product.isPreorder
                ? "Preventa"
                : product.qty > 0
                  ? product.qty
                  : "Agotado"}
            </p>
          </div>
        </div>
        {product.isOffer ? (
          <p className="mt-2 flex items-center gap-1 text-xs font-medium text-rose-500">
            <IconBolt className="size-3.5" aria-hidden />
            Oferta activa
          </p>
        ) : null}
      </CardContent>

      <CardFooter className="px-4 pt-3 pb-4">
        <ProductStoreActions
          productId={product.id}
          compact
          disabled={!inStock}
          className="w-full"
        />
      </CardFooter>
    </Card>
  );
}
