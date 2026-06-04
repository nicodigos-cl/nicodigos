"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { StorefrontProductCardView } from "@/components/store/storefront-product-card";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { storeRoutes } from "@/lib/store/navigation";
import type { StorefrontProductCard } from "@/lib/store/home/types";
import { cn } from "@/lib/utils";

type HomeProductsCarouselProps = {
  products: StorefrontProductCard[];
  className?: string;
};

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
    <div className={cn("min-w-0 -my-4 py-4", className)}>
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
        <CarouselContent className="-ml-3 md:-ml-4 py-4">
          {products.map((product) => (
            <CarouselItem
              key={product.id}
              className="basis-[44%] pl-3 sm:basis-[32%] md:basis-[26%] md:pl-4 lg:basis-[22%] xl:basis-[19%] 2xl:basis-[16%]"
            >
              <StorefrontProductCardView product={product} className="h-full" />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </div>
  );
}
