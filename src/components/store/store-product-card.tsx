import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/products/format";
import { cn } from "@/lib/utils";
import type { StoreProductCardDto } from "@/types/products";

export type StoreProductCardProps = {
  product: StoreProductCardDto;
  className?: string;
  /** Force an "Oferta" / "Nuevo" badge regardless of product flags. */
  badge?: string | null;
  priority?: boolean;
};

export function StoreProductCard({
  product,
  className,
  badge,
  priority = false,
}: StoreProductCardProps) {
  const resolvedBadge =
    badge === undefined ? (product.isOffer ? "Oferta" : null) : badge;

  return (
    <article className={cn("group relative", className)}>
      <div className="relative overflow-hidden rounded-xl bg-muted ring-1 ring-border sm:rounded-2xl">
        {product.imageUrl ? (
          <Image
            alt=""
            src={product.imageUrl}
            width={400}
            height={400}
            priority={priority}
            unoptimized
            className="aspect-square w-full object-cover transition-opacity group-hover:opacity-80 lg:aspect-auto lg:h-72"
          />
        ) : (
          <div
            className="aspect-square w-full bg-muted lg:h-72"
            aria-hidden
          />
        )}
        {resolvedBadge ? (
          <Badge className="absolute top-2 left-2 px-1.5 py-0.5 text-[10px] shadow-sm sm:top-3 sm:left-3 sm:px-2.5 sm:text-xs">
            {resolvedBadge}
          </Badge>
        ) : null}
      </div>

        <div className="mt-2 flex flex-col justify-between gap-1 sm:mt-4 sm:flex-row sm:gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-xs font-medium text-foreground sm:text-sm">
            <Link href={product.href} className="hover:text-primary">
              <span aria-hidden="true" className="absolute inset-0" />
              {product.name}
            </Link>
          </h3>
          {product.categoryName ? (
            <p className="mt-0.5 truncate text-[10px] text-muted-foreground sm:mt-1 sm:text-sm">
              {product.categoryName}
            </p>
          ) : null}
          {product.deliveryDelayed ? (
            <p className="mt-0.5 text-[10px] text-amber-700 dark:text-amber-400 sm:text-xs">
              Entrega en 12–24 horas
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-baseline gap-1.5 text-left sm:block sm:text-right">
          <p className="text-xs font-medium tabular-nums text-foreground sm:text-sm">
            {formatMoney(product.price, product.currency)}
          </p>
          {product.isOffer && product.compareAtPrice ? (
            <p className="text-[10px] tabular-nums text-muted-foreground line-through sm:text-xs">
              {formatMoney(product.compareAtPrice, product.currency)}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
