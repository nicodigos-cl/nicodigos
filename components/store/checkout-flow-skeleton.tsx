import { Skeleton } from "@/components/ui/skeleton";

export function CheckoutStepsSkeleton() {
  return (
    <div className="mx-auto max-w-3xl pb-2" aria-hidden>
      <div className="flex items-center justify-between">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="flex flex-col items-center gap-2 bg-background px-4">
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="h-3 w-14" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CartLineItemsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4" aria-hidden>
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="flex gap-4 rounded-2xl border border-border/60 bg-card p-4 sm:p-5"
        >
          <Skeleton className="size-20 shrink-0 rounded-xl sm:size-24" />
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-24" />
            <div className="mt-auto flex items-center justify-between gap-3">
              <Skeleton className="h-9 w-28 rounded-lg" />
              <Skeleton className="h-5 w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CheckoutSummarySkeleton() {
  return (
    <div
      className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6 space-y-4"
      aria-hidden
    >
      <Skeleton className="h-5 w-32" />
      <div className="space-y-2">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <Skeleton className="h-11 w-full rounded-xl" />
    </div>
  );
}

export function CheckoutFormSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <div className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6 space-y-4">
        <Skeleton className="h-5 w-40" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full sm:col-span-2" />
          <Skeleton className="h-10 w-full sm:col-span-2" />
        </div>
      </div>
      <div className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6 space-y-4">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
      <Skeleton className="h-11 w-full rounded-xl" />
    </div>
  );
}
