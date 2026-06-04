import { IconBolt } from "@tabler/icons-react";

import { CatalogProductSkeleton } from "@/components/store/catalog-product-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

type CatalogPageShellProps = {
  showGrid?: boolean;
};

export function CatalogHero() {
  return (
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
            <IconBolt className="size-3.5" aria-hidden />
            Te llega al tiro
          </div>
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
            Catálogo de keys digitales en Chile
          </h1>
          <p className="text-sm text-muted-foreground/90 max-w-xl leading-relaxed">
            Keys, gift cards y licencias con filtros por plataforma, categoría y
            ofertas. Precios en pesos chilenos y entrega al instante.
          </p>
        </div>
        <div className="flex flex-col items-start md:items-end justify-center shrink-0 bg-background/60 backdrop-blur-md border border-border/40 rounded-2xl p-4 shadow-sm min-w-[160px]">
          <Skeleton className="h-8 w-16 mb-1" />
          <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
            Productos
          </span>
        </div>
      </div>
    </div>
  );
}

export function CatalogPageShell({ showGrid = true }: CatalogPageShellProps) {
  return (
    <div className="space-y-6">
      <CatalogHero />
      <div className="rounded-2xl border border-border/60 bg-card/80 p-4 sm:p-5">
        <Skeleton className="mb-4 h-5 w-40" />
        <div className="grid gap-4 lg:grid-cols-12">
          <Skeleton className="h-8 lg:col-span-4" />
          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-8 lg:grid-cols-4">
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
          </div>
        </div>
      </div>
      {showGrid ? <CatalogProductSkeleton count={12} /> : null}
    </div>
  );
}
