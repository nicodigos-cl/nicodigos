import Link from "next/link";
import {
  IconArrowRight,
  IconBolt,
  IconChevronRight,
  IconSparkles,
} from "@tabler/icons-react";

import { HomeProductsCarousel } from "@/components/marketing/home-products-carousel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GridPattern } from "@/components/ui/grid-pattern";
import { storeRoutes } from "@/lib/store/navigation";
import type { StorefrontProductCard } from "@/lib/store/home/types";
import { cn } from "@/lib/utils";
import { CHILEAN_FLAG_EMOJI } from "@/constants/assets.constants";
import Image from "next/image";

interface HeroSectionProps {
  products: StorefrontProductCard[];
  hasOffers: boolean;
}

/** Cuadrículas resaltadas estilo Magic UI (esquinas suaves). */
const gridHighlights: Array<[number, number]> = [
  [4, 2],
  [8, 1],
  [12, 4],
  [2, 6],
  [15, 3],
];

export default function HeroSection({ products, hasOffers }: HeroSectionProps) {
  return (
    <div
      className={cn(
        "relative isolate overflow-hidden",
        "bg-muted/60 dark:bg-muted/25",
        "border-b border-border pb-16",
      )}
    >
      <GridPattern
        width={48}
        height={48}
        squares={gridHighlights}
        className={cn("opacity-90")}
      />

      <section className="relative pt-10">
        <div className="w-full">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-8 flex justify-center sm:mb-10">
              <Badge
                variant="outline"
                className="rounded-full border-border/80 bg-background/80 px-3 py-1 text-sm font-medium text-muted-foreground backdrop-blur-sm"
              >
                Tu tienda digital chilena
              </Badge>
            </div>

            <h1 className="font-heading text-4xl font-semibold tracking-tight text-balance text-foreground sm:text-5xl lg:text-6xl">
              <span className="inline-flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1">
                <span>
                  Consigue tus keys, gift cards y licencias al tiro{" "}
                  <Image
                    src={CHILEAN_FLAG_EMOJI}
                    alt=""
                    width={48}
                    height={48}
                    className="inline-block size-24 shrink-0"
                    aria-hidden
                  />
                </span>{" "}
              </span>
            </h1>

            <p className="mt-6 text-base font-medium text-pretty text-muted-foreground sm:mt-8 sm:text-lg/8">
              Keys, software y suscripciones con entrega al instante, stock
              real y soporte chileno siempre atento. Compra al toque, sin
              enredos ni letra chica.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <Button asChild size="lg" className="rounded-lg px-6">
                <Link href={storeRoutes.catalog}>
                  Ver todo el catálogo
                  <IconArrowRight className="size-4" />
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                size="lg"
                className="rounded-lg border-border/80 bg-background/60 px-6 backdrop-blur-sm"
              >
                <Link href={storeRoutes.offers}>
                  {hasOffers
                    ? "Aprovecha las medias ofertas"
                    : "Ofertas pa' hoy"}
                </Link>
              </Button>
            </div>
          </div>

          <div className="mt-10 sm:mt-12">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-center gap-2">
                {hasOffers ? (
                  <IconBolt
                    className="size-4 text-muted-foreground"
                    aria-hidden
                  />
                ) : (
                  <IconSparkles
                    className="size-4 text-muted-foreground"
                    aria-hidden
                  />
                )}
                <p className="text-sm font-semibold text-foreground">
                  {hasOffers
                    ? "Ofertas que están filete"
                    : "Recomendados pa' ti"}
                </p>
              </div>

              <Link
                href={hasOffers ? storeRoutes.offers : storeRoutes.catalog}
                className={cn(
                  "group inline-flex items-center gap-1 text-sm font-medium text-primary",
                  "transition-colors hover:text-primary/80",
                )}
              >
                Ver más keys
                <IconChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>

            <HomeProductsCarousel products={products} />
          </div>
        </div>
      </section>
    </div>
  );
}
