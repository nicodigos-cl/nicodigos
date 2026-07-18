export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true" aria-live="polite">
      <div className="space-y-2">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="h-4 w-72 animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-2xl border border-border bg-muted/60"
          />
        ))}
      </div>
      <div className="h-40 animate-pulse rounded-2xl border border-border bg-muted/60" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-56 animate-pulse rounded-2xl border border-border bg-muted/60" />
        <div className="h-56 animate-pulse rounded-2xl border border-border bg-muted/60" />
      </div>
    </div>
  );
}
