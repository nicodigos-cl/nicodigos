import Link from "next/link";
import { IconCalendar, IconClock } from "@tabler/icons-react";

import { SectionShell } from "@/components/home/section-shell";
import { StoreProductCover } from "@/components/store/store-product-cover";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatMoney } from "@/lib/currency/format";
import type { StorefrontProductCard } from "@/lib/store/home/types";
import { storeRoutes } from "@/lib/store/navigation";

type PreordersSectionProps = {
  products: StorefrontProductCard[];
};

export function PreordersSection({ products }: PreordersSectionProps) {
  if (products.length === 0) {
    return null;
  }

  return (
    <SectionShell
      id="preventas"
      eyebrow="Próximos lanzamientos"
      title="Reserva tu juego"
      description="Preventas con fecha de lanzamiento y activación al estrenar."
      href={storeRoutes.catalog}
      className="py-16 sm:py-20"
    >
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <li key={product.id}>
            <Card
              size="sm"
              className="h-full gap-0 overflow-hidden py-0 ring-violet-500/20"
            >
              <Link
                href={storeRoutes.product(product.slug)}
                className="relative block aspect-16/10 bg-muted/30"
              >
                <StoreProductCover
                  src={product.coverImageUrl}
                  alt={product.name}
                  className="h-full w-full object-cover"
                  sizes="(max-width:768px) 100vw, 33vw"
                />
              </Link>
              <CardHeader className="gap-2 px-4 pt-4">
                <CardTitle className="line-clamp-2 text-sm font-extrabold">
                  {product.name}
                </CardTitle>
                {product.releaseDate ? (
                  <p className="flex items-center gap-1.5 text-xs text-violet-400 font-medium">
                    <IconCalendar className="size-3.5" aria-hidden />
                    Lanzamiento: {product.releaseDate}
                  </p>
                ) : (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <IconClock className="size-3.5" aria-hidden />
                    Fecha por confirmar
                  </p>
                )}
              </CardHeader>
              <CardContent className="px-4 pb-0">
                <p className="text-lg font-black tabular-nums">
                  {formatMoney(product.sellPrice)}
                </p>
              </CardContent>
              <CardFooter className="px-4 pb-4">
                <Button asChild className="w-full rounded-xl">
                  <Link href={storeRoutes.product(product.slug)}>
                    Reservar preventa
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}
