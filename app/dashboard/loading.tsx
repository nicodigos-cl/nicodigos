import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";

export default function DashboardLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 md:space-y-8 animate-in fade-in duration-300">
      {/* AccountOverview Skeleton */}
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-2">
            {/* Eyebrow */}
            <Skeleton className="h-4 w-36 rounded-md" />
            {/* Title / Heading */}
            <Skeleton className="h-9 w-64 md:w-80 rounded-lg" />
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {/* Verification Status Badge */}
            <Skeleton className="h-6 w-28 rounded-full" />
            {/* Member Since Badge */}
            <Skeleton className="h-6 w-36 rounded-full" />
          </div>
        </div>
        <Separator className="bg-border/60" />
      </div>

      {/* DashboardStats Skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} size="sm" className="relative overflow-hidden border border-border/40 shadow-sm bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              {/* Stat Title */}
              <Skeleton className="h-3 w-28 rounded-md" />
              {/* Icon Container */}
              <Skeleton className="size-8 rounded-xl" />
            </CardHeader>
            <CardContent className="space-y-2">
              {/* Stat Value */}
              <Skeleton className="h-7 w-20 rounded-md" />
              {/* Stat Description */}
              <Skeleton className="h-3 w-40 rounded-md" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bottom Grid: Activity (2/3) + Quick Actions (1/3) */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Activity & Account Column */}
        <div className="lg:col-span-2 space-y-3">
          <div className="space-y-2">
            {/* Section Header */}
            <Skeleton className="h-5 w-40 rounded-md" />
            <Skeleton className="h-4 w-64 rounded-md" />
          </div>

          <div className="space-y-4">
            {/* Tabs List */}
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24 rounded-lg" />
              <Skeleton className="h-9 w-24 rounded-lg" />
            </div>

            {/* List Skeleton (RecentOrdersList skeleton) */}
            <ul className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <li key={i}>
                  <Card size="sm" className="border border-border/40 shadow-sm bg-card">
                    <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Icon */}
                        <Skeleton className="size-9 rounded-xl shrink-0" />
                        <div className="min-w-0 space-y-1.5">
                          {/* Order Number */}
                          <Skeleton className="h-4 w-32 rounded-md" />
                          {/* Date */}
                          <Skeleton className="h-3 w-24 rounded-md" />
                        </div>
                      </div>
                      {/* Status Badge */}
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </CardHeader>
                    <CardContent className="flex items-center justify-between gap-4 border-t border-border/20 pt-3">
                      {/* Item Count */}
                      <Skeleton className="h-3.5 w-16 rounded-md" />
                      {/* Total Price */}
                      <Skeleton className="h-4.5 w-20 rounded-md" />
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Quick Actions Column */}
        <div className="lg:col-span-1 space-y-3">
          <div className="space-y-2">
            {/* Section Header */}
            <Skeleton className="h-5 w-32 rounded-md" />
            <Skeleton className="h-4 w-52 rounded-md" />
          </div>

          {/* Quick Action Item List */}
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-[min(var(--radius-4xl),24px)] border border-border/40 bg-card p-4"
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  {/* Action Icon */}
                  <Skeleton className="size-11 rounded-2xl shrink-0" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    {/* Action Title */}
                    <Skeleton className="h-4 w-28 rounded-md" />
                    {/* Action Description */}
                    <Skeleton className="h-3 w-36 rounded-md" />
                  </div>
                </div>
                {/* Arrow Icon Indicator */}
                <Skeleton className="size-4 rounded-full shrink-0 ml-2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
