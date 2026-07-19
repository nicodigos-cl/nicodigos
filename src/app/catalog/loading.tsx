import StoreLayout from "@/components/layout/store-layout";
import { StoreProductBands } from "@/components/store/store-product-bands";
import { Skeleton } from "@/components/ui/skeleton";

export default function CatalogLoading() {
  return (
    <StoreLayout>
      <StoreProductBands>
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-4 h-9 w-56 sm:h-11 sm:w-72" />
          <Skeleton className="mt-3 h-4 w-full max-w-md" />

          <div className="mt-8 flex gap-2 overflow-hidden">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton
                key={index}
                className="h-9 w-24 shrink-0 rounded-full"
              />
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
            <Skeleton className="h-9 w-full sm:max-w-sm" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24 rounded-lg" />
              <Skeleton className="h-9 w-28 rounded-lg" />
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-6 sm:gap-y-10 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="space-y-3">
                <Skeleton className="aspect-square w-full rounded-xl sm:rounded-2xl lg:aspect-auto lg:h-72" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            ))}
          </div>
        </div>
      </StoreProductBands>
    </StoreLayout>
  );
}
