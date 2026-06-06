import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const categoryProductGridClassName =
  "grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4";

type CategoryProductSkeletonProps = {
  count?: number;
};

function CategoryProductSkeleton({ count = 8 }: CategoryProductSkeletonProps) {
  return (
    <ul className={categoryProductGridClassName} aria-hidden>
      {Array.from({ length: count }, (_, index) => (
        <li key={index}>
          <div className="flex h-full flex-col overflow-hidden rounded-md border border-border bg-card ring-1 ring-border/40 lg:rounded-2xl lg:ring-0">
            <Skeleton className="aspect-3/4 w-full rounded-none lg:aspect-4/3" />
            <div className="space-y-2 p-2.5 sm:p-3">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
              <div className="flex items-center justify-between pt-1">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-6 rounded-full" />
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function CategoryHeroSkeleton() {
  return (
    <>
      <header className="relative overflow-hidden border-b border-border/80 bg-background lg:hidden">
        <Skeleton className="h-36 w-full rounded-none sm:h-44" />
        <div className="mx-auto w-full max-w-7xl space-y-3 px-4 pb-5 pt-6 sm:px-6">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-48 sm:h-8 sm:w-64" />
          <Skeleton className="h-4 w-full max-w-xl" />
          <Skeleton className="h-4 w-3/4 max-w-md" />
          <div className="flex gap-2 overflow-hidden pb-1">
            <Skeleton className="h-7 w-28 shrink-0 rounded-full" />
            <Skeleton className="h-7 w-32 shrink-0 rounded-full" />
            <Skeleton className="h-7 w-24 shrink-0 rounded-full" />
          </div>
        </div>
      </header>

      <header className="relative hidden h-[60vh] max-h-[700px] min-h-[480px] w-full items-center justify-center overflow-hidden lg:flex">
        <Skeleton className="absolute inset-0 rounded-none" />
        <div className="absolute inset-0 bg-black/45" />
        <div className="relative z-20 mt-16 flex max-w-3xl flex-col items-center gap-4 px-6 text-center">
          <Skeleton className="h-7 w-32 rounded-full" />
          <Skeleton className="h-14 w-80 max-w-full md:h-16 md:w-96" />
          <Skeleton className="h-4 w-full max-w-xl" />
          <Skeleton className="h-4 w-4/5 max-w-lg" />
          <Skeleton className="mt-4 h-12 w-44 rounded-full" />
        </div>
        <Skeleton className="pointer-events-none absolute bottom-0 left-0 right-0 z-30 h-[60px] w-full rounded-none" />
      </header>
    </>
  );
}

function CategoryFiltersSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6", className)}>
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <div className="space-y-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-4/5" />
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-20" />
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-8" />
          <Skeleton className="h-8" />
          <Skeleton className="h-8" />
          <Skeleton className="h-8" />
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    </div>
  );
}

export function CategoryPageSkeleton() {
  return (
    <div
      className="flex min-h-screen flex-col bg-background"
      aria-busy="true"
      aria-label="Cargando categoría"
    >
      <CategoryHeroSkeleton />

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:gap-8 lg:px-8 lg:py-10">
        <div className="hidden flex-col justify-between gap-4 border-b border-border/80 pb-6 lg:flex lg:flex-row lg:items-center">
          <div className="space-y-2">
            <Skeleton className="h-8 w-56 md:h-9 md:w-72" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-7 w-28 rounded-full" />
            <Skeleton className="h-7 w-32 rounded-full" />
            <Skeleton className="h-7 w-24 rounded-full" />
          </div>
        </div>

        <div className="space-y-2 lg:hidden">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-36" />
        </div>

        <Skeleton className="h-11 w-full rounded-xl lg:hidden" />

        <div className="flex w-full flex-col items-start gap-6 lg:flex-row lg:gap-12">
          <aside className="hidden w-[280px] shrink-0 lg:block">
            <div className="sticky top-24 rounded-2xl border border-border/60 bg-card/80 p-5">
              <CategoryFiltersSkeleton />
            </div>
          </aside>

          <div className="w-full flex-1 space-y-4 sm:space-y-6">
            <div className="flex gap-4 border-b border-border/40 pb-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="hidden h-8 w-28 sm:block" />
              <Skeleton className="hidden h-8 w-28 sm:block" />
              <Skeleton className="hidden h-8 w-16 md:block" />
            </div>

            <CategoryProductSkeleton count={8} />
          </div>
        </div>
      </main>
    </div>
  );
}
