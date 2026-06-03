import * as React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { IconAlertTriangle, IconArrowRight, IconPackageOff } from "@tabler/icons-react";
import type { DashboardData } from "@/lib/admin/queries";
import { cn } from "@/lib/utils";

type LowStockListProps = {
  products: DashboardData["lowStockProducts"];
};

const platformConfig: Record<string, string> = {
  steam: "bg-sky-500/10 text-sky-500 border-sky-500/20",
  xbox: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  playstation: "bg-blue-600/10 text-blue-500 border-blue-500/20",
  ps5: "bg-blue-600/10 text-blue-500 border-blue-500/20",
  nintendo: "bg-rose-600/10 text-rose-500 border-rose-500/20",
  epic: "bg-slate-500/10 text-slate-300 border-slate-500/20",
  gog: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

export function LowStockList({ products }: LowStockListProps) {
  return (
    <Card className="glass-card border-none">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg font-bold">Low stock alert</CardTitle>
            {products.length > 0 ? (
              <span className="flex h-2 w-2 rounded-full bg-rose-500 pulse-dot" />
            ) : null}
          </div>
          <CardDescription>
            Active products with fewer than 5 units remaining
          </CardDescription>
        </div>
        {products.length > 0 ? (
          <Badge variant="destructive" className="font-semibold">
            {products.length} {products.length === 1 ? "product" : "products"}
          </Badge>
        ) : null}
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <Empty className="py-6 border-none bg-emerald-500/2">
            <EmptyHeader>
              <EmptyMedia variant="icon" className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <IconPackageOff className="size-5" />
              </EmptyMedia>
              <EmptyTitle className="text-sm font-semibold">Inventory is healthy</EmptyTitle>
              <EmptyDescription className="text-xs">
                No low-stock products right now. All active listings have sufficient inventory.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border/10 bg-background/20 dark:bg-background/5">
            <ul className="divide-y divide-border/10">
              {products.map((product) => {
                const isOutOfStock = product.qty === 0;
                const platformKey = product.platform?.toLowerCase() || "";
                const platStyle = platformConfig[platformKey] || "bg-muted text-muted-foreground border-border/20";

                return (
                  <li
                    key={product.id}
                    className="flex items-center justify-between gap-4 p-4 hover:bg-muted/30 dark:hover:bg-muted/10 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          "size-2.5 rounded-full shrink-0",
                          isOutOfStock ? "bg-rose-500 pulse-dot" : "bg-amber-500"
                        )}
                      />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground text-sm">
                          {product.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={cn("text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border", platStyle)}>
                            {product.platform}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="outline"
                        className={cn(
                          "font-bold tabular-nums",
                          isOutOfStock
                            ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                            : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                        )}
                      >
                        {isOutOfStock ? "Out of Stock" : `${product.qty} left`}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="opacity-0 group-hover:opacity-100 focus:opacity-100 md:opacity-100 hover:bg-primary/10 hover:text-primary transition-all text-xs"
                      >
                        <Link href={`/admin/products?search=${encodeURIComponent(product.name)}`} className="flex items-center gap-1">
                          Manage <IconArrowRight className="size-3" />
                        </Link>
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

