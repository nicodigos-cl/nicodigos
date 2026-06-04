import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";

export default function AdminLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 md:space-y-8 animate-in fade-in duration-300">
      {/* Welcome header & Quick actions Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/10 pb-6">
        <div className="space-y-2">
          {/* Title */}
          <Skeleton className="h-8 w-48 rounded-lg" />
          {/* Subtitle */}
          <Skeleton className="h-4 w-80 rounded-md" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Button 1 */}
          <Skeleton className="h-9 w-28 rounded-lg" />
          {/* Button 2 */}
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
      </div>

      {/* Metrics Section Skeleton */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card
            key={i}
            size="sm"
            className="glass-card border-none relative overflow-hidden flex flex-col justify-between min-h-[120px] p-5 bg-card"
          >
            <div className="flex items-start justify-between w-full">
              <div className="space-y-2">
                {/* Title */}
                <Skeleton className="h-3 w-20 rounded-md" />
                {/* Value */}
                <Skeleton className="h-7 w-24 rounded-md" />
              </div>
              {/* Icon */}
              <Skeleton className="size-10 rounded-xl" />
            </div>
            {/* Divider & Description */}
            <div className="mt-4 pt-3 border-t border-border/10 w-full">
              <Skeleton className="h-3 w-40 rounded-md" />
            </div>
          </Card>
        ))}
      </section>

      {/* Charts & Tables Section Skeleton */}
      <section className="grid gap-6 lg:grid-cols-3">
        {/* Recent Orders Table (col-span-2) */}
        <div className="lg:col-span-2">
          <Card className="glass-card border-none bg-card">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
              <div className="space-y-2">
                <Skeleton className="h-5 w-36 rounded-md" />
                <Skeleton className="h-3 w-48 rounded-md" />
              </div>
              {/* View all button */}
              <Skeleton className="h-8 w-20 rounded-md" />
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-border/10 overflow-hidden bg-background/20 dark:bg-background/5">
                {/* Header row */}
                <div className="flex items-center justify-between p-4 bg-muted/30 border-b border-border/10">
                  <Skeleton className="h-4 w-20 rounded-md" />
                  <Skeleton className="h-4 w-16 rounded-md" />
                  <Skeleton className="h-4 w-12 rounded-md" />
                  <Skeleton className="h-4 w-16 rounded-md" />
                </div>
                {/* Data rows */}
                <div className="divide-y divide-border/10">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-card">
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <Skeleton className="size-9 rounded-full shrink-0" />
                        <div className="space-y-1.5">
                          {/* Name */}
                          <Skeleton className="h-4 w-28 rounded-md" />
                          {/* Email */}
                          <Skeleton className="h-3.5 w-36 rounded-md" />
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        {/* Status */}
                        <Skeleton className="h-5 w-16 rounded-full" />
                        {/* Items count */}
                        <Skeleton className="h-4 w-8 rounded-md" />
                        {/* Total */}
                        <Skeleton className="h-4 w-16 rounded-md" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Orders by Status (col-span-1) */}
        <div className="lg:col-span-1">
          <Card className="glass-card border-none flex flex-col justify-between bg-card">
            <CardHeader className="space-y-2">
              <Skeleton className="h-5 w-36 rounded-md" />
              <Skeleton className="h-3 w-48 rounded-md" />
            </CardHeader>
            <CardContent className="space-y-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {/* Icon */}
                      <Skeleton className="size-7 rounded-lg" />
                      {/* Title */}
                      <Skeleton className="h-4 w-20 rounded-md" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-3 w-8 rounded-md" />
                      <Skeleton className="h-4 w-6 rounded-md" />
                    </div>
                  </div>
                  {/* Progress bar */}
                  <Skeleton className="h-2.5 w-full rounded-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Inventory Alerts Skeleton */}
      <Card className="glass-card border-none bg-card">
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
          <div className="space-y-2">
            <Skeleton className="h-5 w-24 rounded-md" />
            <Skeleton className="h-3.5 w-56 rounded-md" />
          </div>
          {/* Inventory button */}
          <Skeleton className="h-8 w-20 rounded-md" />
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-border/10 overflow-hidden divide-y divide-border/10 bg-background/20 dark:bg-background/5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-card">
                <div className="flex items-center gap-3">
                  {/* Alert dot */}
                  <Skeleton className="size-2.5 rounded-full shrink-0" />
                  <div className="space-y-1.5">
                    {/* Name */}
                    <Skeleton className="h-4 w-48 rounded-md" />
                    {/* Platform */}
                    <Skeleton className="h-4 w-12 rounded-md" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Quantity */}
                  <Skeleton className="h-5 w-16 rounded-full" />
                  {/* Edit button */}
                  <Skeleton className="h-8 w-16 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
