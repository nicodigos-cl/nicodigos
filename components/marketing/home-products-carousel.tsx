"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { PlatformBadge } from "@/components/store/platform-badge";
import { ProductStoreActions } from "@/components/store/product-store-actions";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { formatMoney } from "@/lib/currency/format";
import { storeRoutes } from "@/lib/store/navigation";
import type { StorefrontProductCard } from "@/lib/store/home/types";
import { cn } from "@/lib/utils";

type HomeProductsCarouselProps = {
  products: StorefrontProductCard[];
  className?: string;
};

function ProductSlide({ product }: { product: StorefrontProductCard }) {
  return (
    <div className="group flex h-full w-full min-h-0 flex-col overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm transition-colors hover:border-border">
      <Link
        href={storeRoutes.product(product.slug)}
        className="flex min-h-0 flex-1 flex-col focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
      >
        <div className="relative aspect-16/10 w-full shrink-0 overflow-hidden bg-muted">
          {product.coverImageUrl ? (
            <Image
              src={product.coverImageUrl}
              alt=""
              fill
              unoptimized
              sizes="(max-width:640px) 45vw, (max-width:1280px) 25vw, 240px"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs font-medium text-muted-foreground">
              Sin imagen
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1 p-2.5 sm:p-3">
          <PlatformBadge platform={product.platform} />
          <p className="line-clamp-2 text-xs font-medium leading-snug text-foreground">
            {product.name}
          </p>
          <p className="mt-auto text-sm font-bold tabular-nums text-foreground">
            {formatMoney(product.sellPrice)}
          </p>
        </div>
      </Link>
      <div className="mt-auto shrink-0 border-t border-border/60 px-2.5 py-2.5 sm:px-3">
        <ProductStoreActions
          productId={product.id}
          compact
          className="w-full"
        />
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
        <CarouselContent className="-ml-2 items-stretch sm:-ml-3">
          {products.map((product) => (
            <CarouselItem
              key={product.id}
              className="flex basis-[44%] pl-2 sm:basis-[31%] sm:pl-3 md:basis-[24%] lg:basis-[20%] xl:basis-[17%] 2xl:basis-[15%]"
            >
              <ProductSlide product={product} />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </div>
  );
}
