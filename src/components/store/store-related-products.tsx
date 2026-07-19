import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/products/format";
import type { StoreProductCardDto } from "@/types/products";

type StoreRelatedProductsProps = {
  products: StoreProductCardDto[];
};

export function StoreRelatedProducts({ products }: StoreRelatedProductsProps) {
  if (products.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="related-products-heading"
      className="mt-10 border-t border-border px-4 py-16 sm:px-0"
    >
      <h2
        id="related-products-heading"
        className="font-heading text-xl font-bold tracking-tight text-foreground"
      >
        También te puede interesar
      </h2>

      <div className="mt-8 grid grid-cols-1 gap-y-12 sm:grid-cols-2 sm:gap-x-6 lg:grid-cols-4 xl:gap-x-8">
        {products.map((product) => (
          <article key={product.id} className="group relative">
            <div className="relative">
              <div className="relative h-72 w-full overflow-hidden rounded-2xl bg-muted ring-1 ring-border">
                {product.imageUrl ? (
                  <Image
                    alt={product.name}
                    src={product.imageUrl}
                    fill
                    unoptimized
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover transition-opacity group-hover:opacity-90"
                  />
                ) : (
                  <div className="size-full bg-muted" aria-hidden />
                )}
                {product.isOffer ? (
                  <Badge className="absolute top-3 left-3 shadow-sm">
                    Oferta
                  </Badge>
                ) : null}
                <div className="absolute inset-x-0 top-0 flex h-72 items-end justify-end overflow-hidden rounded-2xl p-4">
                  <div
                    aria-hidden
                    className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-foreground/60 to-transparent"
                  />
                  <p className="relative text-lg font-semibold tabular-nums text-primary-foreground">
                    {formatMoney(product.price, product.currency)}
                  </p>
                </div>
              </div>

              <div className="relative mt-4">
                <h3 className="text-sm font-medium text-foreground">
                  <Link href={product.href} className="hover:text-primary">
                    <span className="absolute inset-0" />
                    {product.name}
                  </Link>
                </h3>
                {product.categoryName ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {product.categoryName}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-6">
              <Button
                variant="secondary"
                className="w-full"
                render={<Link href={product.href} />}
                nativeButton={false}
              >
                Ver producto
                <span className="sr-only">, {product.name}</span>
              </Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
