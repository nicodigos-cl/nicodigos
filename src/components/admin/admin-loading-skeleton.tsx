import { Skeleton } from "@/components/ui/skeleton";

type AdminLoadingSkeletonProps = {
  /** Show the toolbar/filter row skeleton. */
  showToolbar?: boolean;
};

export function AdminLoadingSkeleton({
  showToolbar = true,
}: AdminLoadingSkeletonProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      {showToolbar ? (
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-24" />
        </div>
      ) : null}
      <Skeleton className="h-80 w-full rounded-2xl" />
    </div>
  );
}
