import { MarketingLoadingShell } from "@/components/marketing/marketing-loading-shell";
import {
  CartLineItemsSkeleton,
  CheckoutStepsSkeleton,
  CheckoutSummarySkeleton,
} from "@/components/store/checkout-flow-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export function CartPageSkeleton() {
  return (
    <MarketingLoadingShell contentClassName="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 relative z-10 space-y-8">
      <CheckoutStepsSkeleton />

      <div className="border-b border-border/10 pb-6">
        <div className="flex items-center gap-2.5">
          <Skeleton className="size-9 rounded-xl" />
          <Skeleton className="h-9 w-40" />
        </div>
        <Skeleton className="mt-2 h-4 w-full max-w-md" />
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <CartLineItemsSkeleton count={3} />
        <CheckoutSummarySkeleton />
      </div>
    </MarketingLoadingShell>
  );
}
