import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/products/format";
import { cn } from "@/lib/utils";
import type { StoreProductCardDto } from "@/types/products";

type StorePopularProductsProps = {
  products: StoreProductCardDto[];
  className?: string;
};

export default function StorePopularProducts({
  products,
  className,
}: StorePopularProductsProps) {
  if (products.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="popular-products-heading"
      className={cn("relative", className)}
    >
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2
              id="popular-products-heading"
              className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
            >
              Productos populares
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Destacados y más pedidos de Nicodigos.
            </p>
          </div>
        </div>

        <ul className="mt-8 grid list-none grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4 xl:gap-x-8">
          {products.map((product) => (
            <li key={product.id} className="group relative">
              <div className="relative overflow-hidden rounded-2xl bg-muted ring-1 ring-border">
                {product.imageUrl ? (
                  <Image
                    alt=""
                    src={product.imageUrl}
                    width={400}
                    height={400}
                    unoptimized
                    className="aspect-square w-full object-cover transition-opacity group-hover:opacity-80 lg:aspect-auto lg:h-80"
                  />
                ) : (
                  <div
                    className="aspect-square w-full bg-muted lg:h-80"
                    aria-hidden
                  />
                )}
                {product.isOffer ? (
                  <Badge className="absolute top-3 left-3 shadow-sm">
                    Oferta
                  </Badge>
                ) : null}
              </div>

              <div className="mt-4 flex justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-medium text-foreground">
                    <Link href={product.href} className="hover:text-primary">
                      <span aria-hidden="true" className="absolute inset-0" />
                      {product.name}
                    </Link>
                  </h3>
                  {product.categoryName ? (
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {product.categoryName}
                    </p>
                  ) : null}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-medium tabular-nums text-foreground">
                    {formatMoney(product.price, product.currency)}
                  </p>
                  {product.isOffer && product.compareAtPrice ? (
                    <p className="text-xs tabular-nums text-muted-foreground line-through">
                      {formatMoney(product.compareAtPrice, product.currency)}
                    </p>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
