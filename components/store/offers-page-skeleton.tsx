import { CatalogProductSkeleton } from "@/components/store/catalog-product-skeleton";
import { MarketingLoadingShell } from "@/components/marketing/marketing-loading-shell";
import { Skeleton } from "@/components/ui/skeleton";

export function OffersPageSkeleton() {
  return (
    <MarketingLoadingShell variant="warm" contentClassName="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 relative z-10 space-y-8">
      <div className="relative overflow-hidden rounded-3xl border border-rose-500/20 bg-card p-6 sm:p-10 shadow-lg">
        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <Skeleton className="h-7 w-52 rounded-full" />
            <Skeleton className="h-10 w-64 sm:w-80" />
            <Skeleton className="h-4 w-full max-w-xl" />
          </div>
          <Skeleton className="h-24 w-40 rounded-2xl" />
        </div>
      </div>

      <Skeleton className="h-4 w-48" />
      <CatalogProductSkeleton count={8} />
    </MarketingLoadingShell>
  );
}
