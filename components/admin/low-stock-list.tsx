import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DashboardData } from "@/lib/admin/queries";

type LowStockListProps = {
  products: DashboardData["lowStockProducts"];
};

export function LowStockList({ products }: LowStockListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Low stock</CardTitle>
        <CardDescription>
          Active products with fewer than 5 units
        </CardDescription>
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No low-stock products right now.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {products.map((product) => (
              <li
                key={product.id}
                className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {product.platform}
                  </p>
                </div>
                <Badge variant={product.qty === 0 ? "destructive" : "outline"}>
                  {product.qty} left
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
