import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { OrderStatus } from "@/lib/generated/prisma/client";
import { formatOrderStatus } from "@/lib/admin/format";

type OrdersByStatusProps = {
  items: { status: OrderStatus; count: number }[];
};

export function OrdersByStatus({ items }: OrdersByStatusProps) {
  const max = Math.max(...items.map((item) => item.count), 1);
  const sorted = [...items].sort((a, b) => b.count - a.count);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Orders by status</CardTitle>
        <CardDescription>Distribution across all orders</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">No orders yet.</p>
        ) : (
          sorted.map((item) => (
            <div key={item.status} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span>{formatOrderStatus(item.status)}</span>
                <span className="font-medium tabular-nums">{item.count}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${(item.count / max) * 100}%` }}
                />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
