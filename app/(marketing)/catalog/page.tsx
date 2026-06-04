import type { Metadata } from "next";
import { Suspense } from "react";

import { CatalogExplorer } from "@/components/store/catalog-explorer";
import { CatalogPageShell } from "@/components/store/catalog-page-shell";
import {
  getCatalogFilterOptions,
  searchCatalogProducts,
} from "@/lib/store/catalog/queries";
import { parseCatalogSearchParams } from "@/lib/store/catalog/url";

type CatalogPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({
  searchParams,
}: CatalogPageProps): Promise<Metadata> {
  const params = await searchParams;
  const filters = parseCatalogSearchParams(params);
  const parts: string[] = ["Catálogo"];

  if (filters.q) {
    parts.push(filters.q);
  }
  if (filters.category) {
    parts.push(filters.category);
  }
  if (filters.page > 1) {
    parts.push(`Página ${filters.page}`);
  }

  return {
    title: parts.join(" — "),
    description:
      "Compra keys, gift cards y licencias digitales en Chile. Filtra por plataforma, categoría, ofertas y preventas.",
  };
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const params = await searchParams;
  const filters = parseCatalogSearchParams(params);

  const [initialData, filterOptions] = await Promise.all([
    searchCatalogProducts(filters),
    getCatalogFilterOptions(),
  ]);

  return (
    <main className="flex-1 relative overflow-hidden bg-background">
      <div className="absolute inset-0 admin-dashboard-grid opacity-20 pointer-events-none" />
      <div className="absolute top-[-10%] left-[-10%] -z-10 h-[500px] w-[500px] rounded-full bg-primary/10 blur-[130px] pointer-events-none" />
      <div className="absolute top-[30%] right-[-10%] -z-10 h-[400px] w-[400px] rounded-full bg-indigo-500/10 blur-[110px] pointer-events-none" />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 relative z-10 space-y-8">
        <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-r from-card via-muted/20 to-card p-6 sm:p-10 shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-indigo-500/5" />
          <div className="absolute -right-16 -top-16 size-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary border border-primary/20">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
                Te llega al tiro
              </div>
              <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
                Catálogo de keys digitales en Chile
              </h1>
              <p className="text-sm text-muted-foreground/90 max-w-xl leading-relaxed">
                Keys, gift cards y licencias con filtros por plataforma,
                categoría y ofertas. Precios en pesos chilenos y entrega al
                instante.
              </p>
            </div>
            {initialData.total > 0 ? (
              <div className="flex flex-col items-start md:items-end justify-center shrink-0 bg-background/60 backdrop-blur-md border border-border/40 rounded-2xl p-4 shadow-sm min-w-[160px]">
                <span className="text-2xl font-black text-primary tabular-nums">
                  {initialData.total}
                </span>
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                  Productos
                </span>
              </div>
            ) : null}
          </div>
        </div>

        <Suspense fallback={<CatalogPageShell showGrid />}>
          <CatalogExplorer
            initialFilters={filters}
            initialData={initialData}
            filterOptions={filterOptions}
          />
        </Suspense>
      </div>
    </main>
  );
}
