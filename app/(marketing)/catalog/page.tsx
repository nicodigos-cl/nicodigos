import type { Metadata } from "next";
import Link from "next/link";
import { PlatformBadge } from "@/components/store/platform-badge";
import { ProductStoreActions } from "@/components/store/product-store-actions";
import { StorePagination } from "@/components/store/catalog-pagination";
import { StoreProductCover } from "@/components/store/store-product-cover";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { formatMoney } from "@/lib/currency/format";
import { storeRoutes } from "@/lib/store/navigation";
import { getStorefrontProductsPage } from "@/lib/store/products";
type CatalogPageProps = {
  searchParams: Promise<{ page?: string }>;
};

function parsePageParam(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export async function generateMetadata({
  searchParams,
}: CatalogPageProps): Promise<Metadata> {
  const { page: pageParam } = await searchParams;
  const page = parsePageParam(pageParam);

  return {
    title: page > 1 ? `Catálogo — Página ${page}` : "Catálogo",
  };
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const { page: pageParam } = await searchParams;
  const requestedPage = parsePageParam(pageParam);
  const { products, page, total, totalPages, pageSize } =
    await getStorefrontProductsPage(requestedPage);

  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(page * pageSize, total);

  return (
    <main className="flex-1 relative overflow-hidden bg-background">
      {/* Decorative background elements and orbs */}
      <div className="absolute inset-0 admin-dashboard-grid opacity-20 pointer-events-none" />
      <div className="absolute top-[-10%] left-[-10%] -z-10 h-[500px] w-[500px] rounded-full bg-primary/10 blur-[130px] pointer-events-none" />
      <div className="absolute top-[30%] right-[-10%] -z-10 h-[400px] w-[400px] rounded-full bg-indigo-500/10 blur-[110px] pointer-events-none" />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 relative z-10 space-y-8">
        {/* Creative Hero Banner Header */}
        <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-r from-card via-muted/20 to-card p-6 sm:p-10 shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-indigo-500/5" />
          <div className="absolute -right-16 -top-16 size-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary border border-primary/20">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                Entrega Digital Inmediata
              </div>
              <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
                Catálogo Completo
              </h1>
              <p className="text-sm text-muted-foreground/90 max-w-xl leading-relaxed">
                Keys de juegos, gift cards, licencias y suscripciones
                disponibles las 24 horas del día con soporte inmediato.
              </p>
            </div>
            {total > 0 && (
              <div className="flex flex-col items-start md:items-end justify-center shrink-0 bg-background/60 backdrop-blur-md border border-border/40 rounded-2xl p-4 shadow-sm min-w-[160px]">
                <span className="text-2xl font-black text-primary tabular-nums">
                  {total}
                </span>
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                  Productos
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
                Sin productos
              </EmptyTitle>
              <EmptyDescription className="text-sm">
                No hay productos publicados en el catálogo en este momento.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => {
                return (
                  <li key={product.id}>
                    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl glass-card glass-card-hover transition-all duration-300">
                      <Link
                        href={storeRoutes.product(product.slug)}
                        className="relative overflow-hidden block aspect-16/10 bg-muted/20"
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 pointer-events-none" />
                        <StoreProductCover
                          src={product.coverImageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover rounded-none transition-transform duration-500 group-hover:scale-105"
                          sizes="(max-width:640px) 100vw, 280px"
                        />
                      </Link>

                      <div className="flex flex-1 flex-col gap-3.5 p-5 relative z-10">
                        <PlatformBadge platform={product.platform} />

                        <Link
                          href={storeRoutes.product(product.slug)}
                          className="line-clamp-2 text-sm font-extrabold text-foreground hover:text-primary transition-colors min-h-[40px] leading-snug"
                        >
                          {product.name}
                        </Link>

                        <div className="flex items-baseline justify-between mt-1 border-t border-border/40 pt-3">
                          <span className="text-xs text-muted-foreground/80 font-medium">
                            Precio
                          </span>
                          <p className="text-base font-black text-foreground tabular-nums">
                            {formatMoney(product.sellPrice)}
                          </p>
                        </div>

                        <ProductStoreActions
                          productId={product.id}
                          className="mt-auto pt-2"
                          compact
                        />
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>

            <StorePagination
              page={page}
              totalPages={totalPages}
              basePath={storeRoutes.catalog}
            />
          </>
        )}
      </div>
    </main>
  );
}
