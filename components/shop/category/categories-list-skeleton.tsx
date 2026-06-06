import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const categoryCardGridClassName =
  "flex flex-col gap-2 sm:gap-3 lg:grid lg:grid-cols-3 lg:gap-6 xl:grid-cols-4";

function CategoryCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border/60 bg-card",
        className,
      )}
    >
      <Skeleton className="aspect-4/3 w-full rounded-none lg:aspect-[5/4]" />
      <div className="space-y-2 p-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

export function CategoriesListPageSkeleton() {
  return (
    <div
      className="flex min-h-screen flex-col bg-background"
      aria-busy="true"
      aria-label="Cargando categorías"
    >
      <header className="border-b border-border/80 bg-background px-4 pb-5 pt-6 sm:px-6 lg:hidden">
        <div className="mx-auto w-full max-w-7xl space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-full max-w-xl" />
          <div className="flex gap-2">
            <Skeleton className="h-7 w-28 rounded-full" />
            <Skeleton className="h-7 w-32 rounded-full" />
          </div>
        </div>
      </header>

      <header className="relative hidden h-[50vh] max-h-[600px] min-h-[400px] w-full items-center justify-center overflow-hidden lg:flex">
        <Skeleton className="absolute inset-0 rounded-none" />
        <div className="relative z-20 flex max-w-3xl flex-col items-center gap-4 px-6 text-center">
          <Skeleton className="h-8 w-32 rounded-full" />
          <Skeleton className="h-14 w-72" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:gap-8 lg:px-8 lg:py-10">
        <div className="hidden border-b border-border/80 pb-6 lg:block">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="mt-2 h-4 w-80" />
        </div>

        <div className={categoryCardGridClassName} aria-hidden>
          {Array.from({ length: 8 }, (_, index) => (
            <CategoryCardSkeleton key={index} />
          ))}
        </div>
      </main>
    </div>
  );
}
