"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { ProductStoreActions } from "@/components/store/product-store-actions";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { formatMoney } from "@/lib/currency/format";
import { storeRoutes } from "@/lib/store/navigation";
import type { StorefrontProduct } from "@/lib/store/products";
import { cn } from "@/lib/utils";

type HomeProductsCarouselProps = {
  products: StorefrontProduct[];
  className?: string;
};

function ProductSlide({ product }: { product: StorefrontProduct }) {
  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm ring-1 ring-foreground/5 transition-colors hover:border-primary/30 dark:ring-foreground/10">
      <Link
        href={storeRoutes.product(product.slug)}
        className="block focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
      >
        <div className="relative aspect-16/10 w-full overflow-hidden bg-muted">
          {product.coverImageUrl ? (
            <Image
              src={product.coverImageUrl}
              alt=""
              fill
              unoptimized
              sizes="260px"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs font-medium text-muted-foreground">
              Sin imagen
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1 p-3">
          <p className="line-clamp-1 text-xs font-medium text-primary">
            {product.platform}
          </p>
          <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
            {product.name}
          </p>
          <p className="text-sm font-semibold text-foreground">
            {formatMoney(product.sellPrice)}
          </p>
        </div>
      </Link>
      <div className="px-3 pb-3">
        <ProductStoreActions productId={product.id} compact />
      </div>
    </div>
  );
}

export function HomeProductsCarousel({
  products,
  className,
}: HomeProductsCarouselProps) {
  const [api, setApi] = useState<CarouselApi>();

  useEffect(() => {
    if (!api || products.length < 2) return;

    const interval = window.setInterval(() => {
      api.scrollNext();
    }, 4500);

    return () => window.clearInterval(interval);
  }, [api, products.length]);

  if (products.length === 0) {
    return (
      <div
        className={cn(
          "flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-border bg-muted/40 px-6 text-center",
          className,
        )}
      >
        <p className="text-sm text-muted-foreground">
          Pronto verás productos destacados aquí.{" "}
          <Link
            href={storeRoutes.catalog}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Explorar catálogo
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className={cn("min-w-0", className)}>
      <Carousel
        setApi={setApi}
        opts={{
          align: "start",
          loop: products.length > 2,
          dragFree: true,
        }}
        className="w-full"
        aria-label="Productos destacados"
      >
        <CarouselContent className="-ml-3 md:-ml-4">
          {products.map((product) => (
            <CarouselItem
              key={product.id}
              className="basis-[72%] pl-3 sm:basis-[48%] md:basis-[42%] md:pl-4 lg:basis-[38%] xl:basis-[32%]"
            >
              <ProductSlide product={product} />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </div>
  );
}
