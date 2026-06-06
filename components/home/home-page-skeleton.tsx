import { CatalogProductSkeleton } from "@/components/store/catalog-product-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export function HomePageSkeleton() {
  return (
    <main
      className="flex-1 relative overflow-hidden bg-background"
      aria-busy="true"
      aria-label="Cargando inicio"
    >
      <section className="border-b border-border bg-muted/40 px-4 pb-16 pt-10 sm:px-6">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2 lg:items-center">
          <div className="space-y-5">
            <Skeleton className="h-7 w-40 rounded-full" />
            <Skeleton className="h-12 w-full max-w-lg" />
            <Skeleton className="h-12 w-full max-w-md" />
            <Skeleton className="h-4 w-full max-w-xl" />
            <div className="flex gap-3">
              <Skeleton className="h-11 w-36 rounded-xl" />
              <Skeleton className="h-11 w-32 rounded-xl" />
            </div>
          </div>
          <Skeleton className="aspect-[4/3] w-full rounded-3xl" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-6 px-4 py-16 sm:px-6">
        <div className="space-y-2 text-center sm:text-left">
          <Skeleton className="mx-auto h-3 w-24 sm:mx-0" />
          <Skeleton className="mx-auto h-8 w-56 sm:mx-0" />
          <Skeleton className="mx-auto h-4 w-80 sm:mx-0" />
        </div>
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-44 w-52 shrink-0 rounded-2xl" />
          ))}
        </div>
      </section>

      <section className="bg-primary/90 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <Skeleton className="mx-auto h-8 w-64 bg-primary-foreground/20" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton
                key={index}
                className="h-36 rounded-2xl bg-primary-foreground/10"
              />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-6 px-4 py-16 sm:px-6">
        <Skeleton className="h-8 w-56" />
        <CatalogProductSkeleton count={8} />
      </section>

      <section className="mx-auto max-w-7xl space-y-6 px-4 py-16 sm:px-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-40 rounded-2xl" />
          ))}
        </div>
      </section>
    </main>
  );
}
