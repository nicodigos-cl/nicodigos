import type { Metadata } from "next";
import Link from "next/link";
import { IconBolt } from "@tabler/icons-react";

import { StorePagination } from "@/components/store/catalog-pagination";
import { StorefrontProductCardView } from "@/components/store/storefront-product-card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { getStorefrontOffersPage } from "@/lib/store/offers/queries";
import { storeRoutes } from "@/lib/store/navigation";
type OffersPageProps = {
  searchParams: Promise<{ page?: string }>;
};

function parsePageParam(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export async function generateMetadata({
  searchParams,
}: OffersPageProps): Promise<Metadata> {
  const { page: pageParam } = await searchParams;
  const page = parsePageParam(pageParam);

  return {
    title: page > 1 ? `Ofertas — Página ${page}` : "Ofertas",
    description:
      "Promociones y precios destacados en keys, gift cards y licencias digitales.",
  };
}

export default async function OffersPage({ searchParams }: OffersPageProps) {
  const { page: pageParam } = await searchParams;
  const requestedPage = parsePageParam(pageParam);
  const { products, page, total, totalPages, pageSize } =
    await getStorefrontOffersPage(requestedPage);

  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(page * pageSize, total);

  return (
    <main className="flex-1 relative overflow-hidden bg-background">
      {/* Decorative background elements and warm/hot orbs */}
      <div className="absolute inset-0 admin-dashboard-grid opacity-20 pointer-events-none" />
      <div className="absolute top-[-10%] right-[-10%] -z-10 h-[500px] w-[500px] rounded-full bg-rose-500/10 blur-[130px] pointer-events-none" />
      <div className="absolute top-[20%] left-[-10%] -z-10 h-[450px] w-[450px] rounded-full bg-amber-500/10 blur-[120px] pointer-events-none" />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 relative z-10 space-y-8">
        {/* Creative Hero Banner Header with Warm Tone Gradient */}
        <div className="relative overflow-hidden rounded-3xl border border-rose-500/20 bg-gradient-to-r from-card via-rose-500/5 to-card p-6 sm:p-10 shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-r from-rose-500/5 via-transparent to-amber-500/5" />
          <div className="absolute -right-16 -top-16 size-48 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-500 border border-rose-500/20">
                <IconBolt className="size-3.5 text-rose-500 animate-pulse" />
                Descuentos Exclusivos Activos
              </div>
              <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl bg-gradient-to-r from-foreground to-rose-500 bg-clip-text">
                Ofertas Especiales
              </h1>
              <p className="text-sm text-muted-foreground/90 max-w-xl leading-relaxed">
                Precios especiales y promociones por tiempo limitado en keys y
                herramientas de software seleccionados.
              </p>
            </div>
            {total > 0 && (
              <div className="flex flex-col items-start md:items-end justify-center shrink-0 bg-background/60 backdrop-blur-md border border-rose-500/20 rounded-2xl p-4 shadow-sm min-w-[160px]">
                <span className="text-2xl font-black text-rose-500 tabular-nums">
                  {total}
                </span>
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                  En Promoción
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Info/Filter Row */}
        {total > 0 ? (
          <div className="flex items-center justify-between border-b border-border/10 pb-4">
            <p className="text-xs text-muted-foreground font-medium">
              Mostrando{" "}
              <span className="text-foreground font-semibold">
                {rangeStart}–{rangeEnd}
              </span>{" "}
              de <span className="text-foreground font-semibold">{total}</span>{" "}
              productos
            </p>
          </div>
        ) : null}

        {products.length === 0 ? (
          <Empty className="py-16 border-dashed bg-muted/5">
            <EmptyHeader>
              <EmptyTitle className="text-base font-bold">
                Sin ofertas por ahora
              </EmptyTitle>
              <EmptyDescription className="text-sm">
                No hay productos marcados como oferta con stock. Explora el
                catálogo completo mientras tanto.
              </EmptyDescription>
            </EmptyHeader>
            <Link
              href={storeRoutes.catalog}
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Ver catálogo
            </Link>
          </Empty>
        ) : (
          <>
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <li key={product.id} className="h-full">
                  <StorefrontProductCardView product={product} />
                </li>
              ))}
            </ul>

            <StorePagination
              page={page}
              totalPages={totalPages}
              basePath={storeRoutes.offers}
            />
          </>
        )}
      </div>
    </main>
  );
}
