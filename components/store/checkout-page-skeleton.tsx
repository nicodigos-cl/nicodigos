import { MarketingLoadingShell } from "@/components/marketing/marketing-loading-shell";
import {
  CheckoutFormSkeleton,
  CheckoutStepsSkeleton,
} from "@/components/store/checkout-flow-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export function CheckoutPageSkeleton() {
  return (
    <MarketingLoadingShell contentClassName="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8 relative z-10 space-y-8">
      <CheckoutStepsSkeleton />

      <div className="space-y-2 border-b border-border/10 pb-6">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-4 w-full max-w-xl" />
        <Skeleton className="h-4 w-5/6 max-w-lg" />
      </div>

      <CheckoutFormSkeleton />
    </MarketingLoadingShell>
  );
}
