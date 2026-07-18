export default function CustomerPedidoDetailLoading() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true" aria-live="polite">
      <div className="space-y-2">
        <div className="h-4 w-56 animate-pulse rounded bg-muted" />
        <div className="h-8 w-64 animate-pulse rounded-lg bg-muted" />
        <div className="h-4 w-48 animate-pulse rounded bg-muted" />
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="h-9 w-28 animate-pulse rounded-full bg-muted/60" />
        <div className="h-9 w-32 animate-pulse rounded-full bg-muted/60" />
      </div>

      <div className="h-40 animate-pulse rounded-2xl border border-border bg-muted/60" />
      <div className="h-48 animate-pulse rounded-2xl border border-border bg-muted/60" />

      <div className="space-y-4">
        <div className="h-6 w-40 animate-pulse rounded bg-muted" />
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={index}
            className="h-32 animate-pulse rounded-2xl border border-border bg-muted/60"
          />
        ))}
      </div>

      <div className="h-56 animate-pulse rounded-2xl border border-border bg-muted/60" />
    </div>
  );
}
