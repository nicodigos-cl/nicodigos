import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import type { OrderStatus } from "@/lib/generated/prisma/client";
import { formatOrderStatus } from "@/lib/admin/format";
import {
  IconCircleCheck,
  IconLoader,
  IconClock,
  IconCircleX,
  IconArrowBackUp,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

type OrdersByStatusProps = {
  items: { status: OrderStatus; count: number }[];
};

const statusConfig: Record<
  OrderStatus,
  {
    gradient: string;
    text: string;
    bgSoft: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  COMPLETED: {
    gradient: "from-emerald-500 to-teal-400",
    text: "text-emerald-500 dark:text-emerald-400",
    bgSoft: "bg-emerald-500/10 border-emerald-500/20",
    icon: IconCircleCheck,
  },
  PROCESSING: {
    gradient: "from-indigo-500 to-purple-400",
    text: "text-indigo-500 dark:text-indigo-400",
    bgSoft: "bg-indigo-500/10 border-indigo-500/20",
    icon: IconLoader,
  },
  PENDING: {
    gradient: "from-amber-500 to-orange-400",
    text: "text-amber-500 dark:text-amber-400",
    bgSoft: "bg-amber-500/10 border-amber-500/20",
    icon: IconClock,
  },
  CANCELED: {
    gradient: "from-rose-500 to-pink-400",
    text: "text-rose-500 dark:text-rose-400",
    bgSoft: "bg-rose-500/10 border-rose-500/20",
    icon: IconCircleX,
  },
  REFUNDED: {
    gradient: "from-purple-500 to-violet-400",
    text: "text-purple-500 dark:text-purple-400",
    bgSoft: "bg-purple-500/10 border-purple-500/20",
    icon: IconArrowBackUp,
  },
};

export function OrdersByStatus({ items }: OrdersByStatusProps) {
  const total = items.reduce((acc, item) => acc + item.count, 0);
  const max = Math.max(...items.map((item) => item.count), 1);
  const sorted = [...items].sort((a, b) => b.count - a.count);

  return (
    <Card className="glass-card border-none flex flex-col justify-between">
      <CardHeader>
        <CardTitle className="text-lg font-bold">Orders by status</CardTitle>
        <CardDescription>Distribution across all orders ({total} total)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {sorted.length === 0 ? (
          <Empty className="py-6 border-none bg-muted/5">
            <EmptyHeader>
              <EmptyTitle className="text-sm font-semibold">No status data</EmptyTitle>
              <EmptyDescription className="text-xs">
                No orders are available to group by status.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          sorted.map((item) => {
            const config = statusConfig[item.status] || {
              gradient: "from-primary to-primary/80",
              text: "text-primary",
              bgSoft: "bg-primary/10 border-primary/20",
              icon: IconClock,
            };
            const Icon = config.icon;
            const percentage = total > 0 ? Math.round((item.count / total) * 100) : 0;

            return (
              <div key={item.status} className="space-y-2 group/status">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className={cn("p-1.5 rounded-lg border", config.bgSoft)}>
                      <Icon className={cn("size-4", item.status === "PROCESSING" && "animate-spin [animation-duration:3s]")} />
                    </div>
                    <span className="font-semibold text-muted-foreground group-hover/status:text-foreground transition-colors">
                      {formatOrderStatus(item.status)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground/70">
                      {percentage}%
                    </span>
                    <span className={cn("font-bold tabular-nums", config.text)}>
                      {item.count}
                    </span>
                  </div>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-muted/50 dark:bg-muted/30">
                  <div
                    className={cn(
                      "h-full rounded-full bg-gradient-to-r transition-all duration-500 ease-out group-hover/status:opacity-90 relative",
                      config.gradient
                    )}
                    style={{ width: `${(item.count / max) * 100}%` }}
                  >
                    {/* Inner highlight */}
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.15)_50%,transparent_100%)] animate-pulse" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

