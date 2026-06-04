import Link from "next/link";
import { IconBolt, IconClock, IconCalendar } from "@tabler/icons-react";

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

export type StorefrontCardProduct = {
  id: string;
  slug: string;
  name: string;
  platform: string;
  coverImageUrl: string | null;
  sellPrice: string;

  description?: string | null;
  genres?: string[];
  listPrice?: string | null;
  discountPercent?: number | null;
  qty?: number;
  isOffer?: boolean;
  isPreorder?: boolean;
  releaseDate?: string | null;
  regionName?: string | null;
  languages?: string[];
  developers?: string[];
  publishers?: string[];
  offer?: {
    sellPrice: string;
    qty: number;
    isPreorder: boolean;
  } | null;
};

type StorefrontProductCardProps = {
  product: StorefrontCardProduct;
  className?: string;
};

export function StorefrontProductCardView({
  product,
  className,
}: StorefrontProductCardProps) {
  const isPreorder = !!product.isPreorder;
  const qty = product.qty ?? 1;
  const inStock = qty > 0 || isPreorder;
  const displayPrice = product.offer?.sellPrice ?? product.sellPrice;

  return (
    <Card
      size="sm"
      className={cn(
        "group relative h-full gap-0 overflow-hidden py-0 ring-border/40 transition-all duration-300 hover:ring-primary/30 pt-0!",
        className,
      )}
    >
      {product.isOffer && product.discountPercent ? (
        <Badge className="absolute right-3 top-3 z-20 border-0 bg-rose-500 font-bold text-white shadow-md">
          -{product.discountPercent}%
        </Badge>
      ) : null}
      {isPreorder ? (
        <Badge
          variant="outline"
          className="absolute left-3 top-3 z-20 border-violet-500/30 bg-violet-500/10 text-violet-400 font-semibold"
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
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 rounded-none"
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
        {isPreorder ? (
          product.releaseDate ? (
            <p className="flex items-center gap-1 text-xs text-violet-400 font-semibold">
              <IconCalendar className="size-3.5" aria-hidden />
              Lanzamiento: {product.releaseDate}
            </p>
          ) : (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <IconClock className="size-3.5" aria-hidden />
              Fecha por confirmar
            </p>
          )
        ) : product.genres && product.genres.length > 0 ? (
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
              {isPreorder
                ? "Preventa"
                : qty > 0
                  ? qty
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
