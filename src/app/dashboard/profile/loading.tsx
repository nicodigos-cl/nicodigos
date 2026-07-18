export default function CustomerProfileLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
      {/* Breadcrumb + Header Title/Desc Skeleton */}
      <div className="space-y-3">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
            <div className="h-4 w-72 animate-pulse rounded bg-muted" />
          </div>
          <div className="flex gap-2 shrink-0">
            <div className="h-9 w-32 animate-pulse rounded-full bg-muted" />
            <div className="h-9 w-36 animate-pulse rounded-full bg-muted" />
          </div>
        </div>
      </div>

      {/* Completion Card Skeleton */}
      <div className="h-32 animate-pulse rounded-2xl border border-border bg-muted/60" />

      {/* Forms Skeletons */}
      <div className="space-y-6">
        {/* Personal Info Form Skeleton */}
        <div className="rounded-2xl border border-border p-5 space-y-6">
          <div className="flex gap-3 items-center">
            <div className="h-9 w-9 rounded-lg animate-pulse bg-muted" />
            <div className="space-y-1">
              <div className="h-5 w-32 animate-pulse rounded bg-muted" />
              <div className="h-3.5 w-48 animate-pulse rounded bg-muted" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <div className="h-4 w-12 animate-pulse rounded bg-muted" />
              <div className="h-9 w-full animate-pulse rounded-3xl bg-muted" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              <div className="h-9 w-full animate-pulse rounded-3xl bg-muted" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              <div className="h-9 w-full animate-pulse rounded-3xl bg-muted" />
            </div>
          </div>
        </div>

        {/* Billing Info Form Skeleton */}
        <div className="rounded-2xl border border-border p-5 space-y-6">
          <div className="flex gap-3 items-center">
            <div className="h-9 w-9 rounded-lg animate-pulse bg-muted" />
            <div className="space-y-1">
              <div className="h-5 w-40 animate-pulse rounded bg-muted" />
              <div className="h-3.5 w-60 animate-pulse rounded bg-muted" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="h-4 w-28 animate-pulse rounded bg-muted" />
              <div className="h-9 w-full animate-pulse rounded-3xl bg-muted" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-12 animate-pulse rounded bg-muted" />
              <div className="h-9 w-full animate-pulse rounded-3xl bg-muted" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              <div className="h-9 w-full animate-pulse rounded-3xl bg-muted" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <div className="h-4 w-36 animate-pulse rounded bg-muted" />
              <div className="h-9 w-full animate-pulse rounded-3xl bg-muted" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              <div className="h-9 w-full animate-pulse rounded-3xl bg-muted" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              <div className="h-9 w-full animate-pulse rounded-3xl bg-muted" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              <div className="h-9 w-full animate-pulse rounded-3xl bg-muted" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
