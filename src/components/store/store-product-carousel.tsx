"use client";

import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { formatMoney } from "@/lib/products/format";
import { cn } from "@/lib/utils";
import type { StoreProductCardDto } from "@/types/products";

export type CarouselTone = "trending" | "new" | "offers";

export type StoreProductCarouselProps = {
  id: string;
  title: string;
  description: string;
  href?: string;
  ctaLabel?: string;
  eyebrow?: string;
  products: StoreProductCardDto[];
  /** Force a badge on every card, or use product offer flag. */
  badgeMode?: "offer" | "new" | "auto";
  tone?: CarouselTone;
  className?: string;
};

const toneConfig: Record<
  CarouselTone,
  {
    eyebrow: string;
  }
> = {
  trending: {
    eyebrow: "text-primary",
  },
  new: {
    eyebrow: "text-foreground/70",
  },
  offers: {
    eyebrow: "text-primary",
  },
};

function cardBadge(
  product: StoreProductCardDto,
  badgeMode: "offer" | "new" | "auto",
): string | null {
  if (badgeMode === "new") return "Nuevo";
  if (badgeMode === "offer") return product.isOffer ? "Oferta" : null;
  return product.isOffer ? "Oferta" : null;
}

export default function StoreProductCarousel({
  id,
  title,
  description,
  href = "/catalog",
  ctaLabel = "Ver catálogo",
  eyebrow,
  products,
  badgeMode = "auto",
  tone = "trending",
  className,
}: StoreProductCarouselProps) {
  if (products.length === 0) {
    return null;
  }

  const headingId = `${id}-heading`;
  const config = toneConfig[tone];

  return (
    <section aria-labelledby={headingId} className={cn("relative", className)}>
      <div className="relative z-10 mx-auto px-4 max-w-7xl py-6 sm:py-20">
        <div className="flex items-end justify-between gap-4">
          <div className="max-w-2xl">
            {eyebrow ? (
              <p
                className={cn(
                  "text-[10px] sm:text-xs font-bold uppercase tracking-widest",
                  config.eyebrow,
                )}
              >
                {eyebrow}
              </p>
            ) : null}
            <h2
              id={headingId}
              className={cn(
                "font-heading text-xl sm:text-3xl font-bold tracking-tight text-foreground",
                eyebrow && "mt-0.5 sm:mt-2",
              )}
            >
              {title}
            </h2>
            <p className="hidden sm:block mt-2 text-sm text-muted-foreground sm:text-base">
              {description}
            </p>
          </div>

          {/* Mobile 'Ver más' link */}
          <Link
            href={href}
            className="mb-1 sm:hidden shrink-0 text-xs font-bold text-primary active:opacity-70 transition-opacity"
          >
            Ver más &rarr;
          </Link>

          {/* Desktop CTA button */}
          <Link
            href={href}
            className="hidden sm:inline-flex shrink-0 rounded-full border border-border/60 bg-background/70 px-4 py-2 text-sm font-medium text-primary backdrop-blur-sm transition-colors hover:border-primary/40 hover:bg-background"
          >
            {ctaLabel}
            <span aria-hidden="true" className="ml-1">
              →
            </span>
          </Link>
        </div>

        <div className="relative mt-4 sm:mt-10">
          <Carousel
            opts={{
              align: "start",
              loop: products.length > 4,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-3">
              {products.map((product) => {
                const badge = cardBadge(product, badgeMode);
                return (
                  <CarouselItem
                    key={product.id}
                    className="pl-3 basis-[40%] sm:basis-1/2 md:basis-1/3 lg:basis-1/4"
                  >
                    <article className="group relative h-full">
                      <div
                        className={cn(
                          "relative h-32 w-full overflow-hidden rounded-xl bg-muted/80 ring-1 ring-border/80 transition-all duration-300 sm:h-56 lg:h-72 xl:h-80 sm:rounded-2xl",
                          "group-hover:ring-primary/25 group-hover:shadow-lg group-hover:shadow-primary/5",
                          tone === "offers" && "ring-primary/15",
                          tone === "new" && "rounded-2xl sm:rounded-3xl",
                        )}
                      >
                        {product.imageUrl ? (
                          <Image
                            alt={product.name}
                            src={product.imageUrl}
                            fill
                            unoptimized
                            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 33vw, 25vw"
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="size-full bg-muted" aria-hidden />
                        )}
                        {badge ? (
                          <Badge
                            className={cn(
                              "absolute top-2 left-2 shadow-sm text-[10px] px-1.5 py-0.5",
                              tone === "new" && "bg-foreground text-background",
                              tone === "offers" &&
                                "bg-primary text-primary-foreground",
                            )}
                          >
                            {badge}
                          </Badge>
                        ) : null}
                      </div>

                      <h3 className="mt-2 text-xs sm:text-sm font-medium text-foreground line-clamp-2 leading-snug">
                        <Link
                          href={product.href}
                          className="hover:text-primary"
                        >
                          <span className="absolute inset-0" />
                          {product.name}
                        </Link>
                      </h3>
                      {product.categoryName ? (
                        <p className="mt-0.5 text-[10px] sm:text-xs text-muted-foreground">
                          {product.categoryName}
                        </p>
                      ) : null}
                      <div className="mt-1 flex items-baseline gap-1.5 flex-wrap">
                        <p className="text-xs sm:text-sm font-semibold tabular-nums text-foreground">
                          {formatMoney(product.price, product.currency)}
                        </p>
                        {product.isOffer && product.compareAtPrice ? (
                          <p className="text-[10px] sm:text-xs tabular-nums text-muted-foreground line-through">
                            {formatMoney(
                              product.compareAtPrice,
                              product.currency,
                            )}
                          </p>
                        ) : null}
                      </div>
                    </article>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
            <CarouselPrevious className="hidden sm:flex -left-3 lg:-left-12 border-border/70 bg-background/90 backdrop-blur-sm" />
            <CarouselNext className="hidden sm:flex -right-3 lg:-right-12 border-border/70 bg-background/90 backdrop-blur-sm" />
          </Carousel>
        </div>
      </div>
    </section>
  );
}
