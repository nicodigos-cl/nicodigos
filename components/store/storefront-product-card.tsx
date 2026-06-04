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
        "group relative flex h-full flex-col gap-0 overflow-hidden py-0 border border-border/80 bg-card rounded-2xl shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 pt-0!",
        className,
      )}
    >
      {product.isOffer && product.discountPercent ? (
        <Badge className="absolute right-3 top-3 z-20 border-0 bg-rose-500 font-extrabold text-white shadow-md text-[10px] tracking-wider uppercase">
          -{product.discountPercent}% OFF
        </Badge>
      ) : null}
      {isPreorder ? (
        <Badge
          variant="outline"
          className="absolute left-3 top-3 z-20 border-violet-500/20 bg-violet-500/10 text-violet-400 font-bold text-[10px]"
        >
          <IconClock className="size-3" aria-hidden />
          Preventa
        </Badge>
      ) : null}

      <Link
        href={storeRoutes.product(product.slug)}
        className="relative block aspect-[2/1] shrink-0 overflow-hidden bg-muted/40 border-b border-border/40"
      >
        <StoreProductCover
          src={product.coverImageUrl}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] rounded-none"
          sizes="(max-width:640px) 100vw, 280px"
        />
        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      </Link>

      <div className="flex min-h-0 flex-1 flex-col px-3 pt-2.5 pb-2.5">
        <CardHeader className="gap-1.5 p-0">
          <div className="flex items-center justify-between gap-1">
            <PlatformBadge platform={product.platform} />
            {product.regionName ? (
              <span className="truncate text-[9px] font-bold uppercase tracking-wide text-muted-foreground/80">
                {product.regionName === "Global"
                  ? "Global"
                  : product.regionName}
              </span>
            ) : null}
          </div>

          <CardTitle className="line-clamp-2 text-[13px] font-extrabold leading-snug group-hover:text-primary transition-colors duration-200">
            <Link href={storeRoutes.product(product.slug)}>{product.name}</Link>
          </CardTitle>

          {isPreorder ? (
            product.releaseDate ? (
              <p className="flex items-center gap-1 text-[10px] text-violet-400 font-semibold">
                <IconCalendar className="size-3 shrink-0" aria-hidden />
                <span className="truncate">{product.releaseDate}</span>
              </p>
            ) : (
              <p className="text-[10px] text-muted-foreground">Preventa</p>
            )
          ) : product.genres && product.genres.length > 0 ? (
            <p className="line-clamp-1 text-[10px] text-muted-foreground/80">
              {product.genres.slice(0, 2).join(" · ")}
            </p>
          ) : null}
        </CardHeader>

        <div className="mt-auto flex flex-col gap-2 pt-2">
          <CardContent className="p-0">
            <div className="flex items-center justify-between gap-2 border-t border-border/40 pt-2">
              <div className="min-w-0">
                {product.listPrice ? (
                  <p className="text-[10px] text-muted-foreground/75 line-through tabular-nums">
                    {formatMoney(product.listPrice)}
                  </p>
                ) : null}
                <p className="text-base font-black tabular-nums text-foreground leading-none">
                  {formatMoney(displayPrice)}
                </p>
              </div>
              <p className="shrink-0 text-[10px] font-semibold tabular-nums">
                {isPreorder ? (
                  <span className="text-violet-400">Reserva</span>
                ) : qty > 0 ? (
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {qty} u.
                  </span>
                ) : (
                  <span className="text-muted-foreground">Agotado</span>
                )}
              </p>
            </div>
            {product.isOffer ? (
              <p className="mt-1 flex items-center gap-0.5 text-[10px] font-bold text-rose-500">
                <IconBolt className="size-3" aria-hidden />
                Oferta
              </p>
            ) : null}
          </CardContent>

          <CardFooter className="p-0">
            <ProductStoreActions
              productId={product.id}
              compact
              disabled={!inStock}
              className="w-full flex-row gap-1.5 [&_button]:min-h-8 [&_button]:flex-1 [&_button]:px-2 [&_button]:text-xs"
            />
          </CardFooter>
        </div>
      </div>
    </Card>
  );
}
