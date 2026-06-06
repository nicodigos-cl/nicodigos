import { Skeleton } from "@/components/ui/skeleton";

export function ProductPageSkeleton() {
  return (
    <main
      className="flex-1 bg-background"
      aria-busy="true"
      aria-label="Cargando producto"
    >
      <div className="mx-auto px-4 py-10 sm:px-6 sm:py-16 lg:max-w-7xl lg:px-8">
        <Skeleton className="mb-8 h-8 w-56 rounded-full" />

        <div className="lg:grid lg:grid-cols-7 lg:grid-rows-1 lg:gap-x-8 lg:gap-y-10 xl:gap-x-16">
          <div className="lg:col-span-4 lg:row-end-1">
            <Skeleton className="aspect-square w-full rounded-2xl sm:aspect-4/3" />
            <div className="mt-4 hidden gap-3 sm:grid sm:grid-cols-5">
              {Array.from({ length: 5 }, (_, index) => (
                <Skeleton key={index} className="aspect-square rounded-xl" />
              ))}
            </div>
          </div>

          <div className="mx-auto mt-10 max-w-2xl sm:mt-12 lg:col-span-3 lg:row-span-2 lg:row-end-2 lg:mt-0 lg:max-w-none">
            <div className="flex gap-2">
              <Skeleton className="h-7 w-24 rounded-full" />
              <Skeleton className="h-7 w-16 rounded-full" />
            </div>
            <Skeleton className="mt-4 h-9 w-full max-w-lg" />
            <Skeleton className="mt-2 h-4 w-40" />
            <Skeleton className="mt-2 h-10 w-32" />
            <Skeleton className="mt-1 h-4 w-48" />
            <div className="mt-6 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
            <div className="mt-10 flex gap-3">
              <Skeleton className="h-11 flex-1 rounded-xl" />
              <Skeleton className="h-11 w-11 rounded-xl" />
            </div>
            <div className="mt-10 space-y-3 border-t border-border pt-10">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
              <Skeleton className="h-3 w-4/5" />
            </div>
            <div className="mt-10 grid gap-6 border-t border-border pt-10 sm:grid-cols-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>

          <div className="mx-auto mt-12 w-full max-w-2xl lg:col-span-4 lg:mt-0 lg:max-w-none">
            <div className="flex gap-4 border-b border-border pb-4">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-8 w-28" />
            </div>
            <div className="mt-6 space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-32 w-full rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
