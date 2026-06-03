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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatMoney, formatOrderStatus } from "@/lib/admin/format";
import type { OrderStatus } from "@/lib/generated/prisma/client";
import type { DashboardData } from "@/lib/admin/queries";
import { IconArrowRight, IconShoppingCart } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

type RecentOrdersTableProps = {
  orders: DashboardData["recentOrders"];
};

const statusConfig: Record<
  OrderStatus,
  { label: string; className: string }
> = {
  COMPLETED: {
    label: "Completed",
    className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 dark:bg-emerald-500/20 dark:border-emerald-500/30",
  },
  PROCESSING: {
    label: "Processing",
    className: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20 dark:bg-indigo-500/20 dark:border-indigo-500/30",
  },
  PENDING: {
    label: "Pending",
    className: "bg-amber-500/10 text-amber-500 border-amber-500/20 dark:bg-amber-500/20 dark:border-amber-500/30",
  },
  CANCELED: {
    label: "Canceled",
    className: "bg-rose-500/10 text-rose-500 border-rose-500/20 dark:bg-rose-500/20 dark:border-rose-500/30",
  },
  REFUNDED: {
    label: "Refunded",
    className: "bg-purple-500/10 text-purple-500 border-purple-500/20 dark:bg-purple-500/20 dark:border-purple-500/30",
  },
};

const avatarGradients = [
  "from-pink-500/10 to-rose-500/10 text-rose-500 border-rose-500/10 dark:text-rose-400",
  "from-purple-500/10 to-indigo-500/10 text-indigo-500 border-indigo-500/10 dark:text-indigo-400",
  "from-blue-500/10 to-sky-500/10 text-sky-500 border-sky-500/10 dark:text-sky-400",
  "from-emerald-500/10 to-teal-500/10 text-teal-500 border-teal-500/10 dark:text-teal-400",
  "from-amber-500/10 to-orange-500/10 text-orange-500 border-orange-500/10 dark:text-orange-400",
];

const getAvatarGradient = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % avatarGradients.length;
  return avatarGradients[index];
};

const getInitials = (name: string, email: string) => {
  const text = name || email || "?";
  const parts = text.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return text.substring(0, 2).toUpperCase();
};

export function RecentOrdersTable({ orders }: RecentOrdersTableProps) {
  return (
    <Card className="glass-card border-none">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="space-y-1">
          <CardTitle className="text-lg font-bold">Recent orders</CardTitle>
          <CardDescription>Latest 10 orders across the store</CardDescription>
        </div>
        <IconShoppingCart className="size-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <Empty className="py-8 border-none bg-muted/5">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <IconShoppingCart className="size-5" />
              </EmptyMedia>
              <EmptyTitle className="text-sm font-semibold">No orders yet</EmptyTitle>
              <EmptyDescription className="text-xs">
                Orders will appear here as soon as customers make purchases.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/10 bg-background/20 dark:bg-background/5">
            <Table>
              <TableHeader className="bg-muted/30 dark:bg-muted/10">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="py-3 pl-4 font-semibold">Customer</TableHead>
                  <TableHead className="py-3 font-semibold">Status</TableHead>
                  <TableHead className="py-3 text-right font-semibold">Items</TableHead>
                  <TableHead className="py-3 text-right font-semibold">Total</TableHead>
                  <TableHead className="py-3 text-right font-semibold">Date</TableHead>
                  <TableHead className="py-3 pr-4"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => {
                  const status = statusConfig[order.status] || {
                    label: formatOrderStatus(order.status),
                    className: "bg-muted text-muted-foreground border-border/20",
                  };
                  const hashSource = order.customerName || order.customerEmail || order.id;
                  const avatarGradient = getAvatarGradient(hashSource);
                  const initials = getInitials(order.customerName, order.customerEmail);

                  return (
                    <TableRow key={order.id} className="hover:bg-muted/20 dark:hover:bg-muted/10 transition-colors group/row">
                      <TableCell className="py-3.5 pl-4">
                        <div className="flex items-center gap-3">
                          {/* deterministic avatar */}
                          <div className={cn(
                            "flex items-center justify-center size-9 rounded-full border text-xs font-bold bg-gradient-to-br shrink-0",
                            avatarGradient
                          )}>
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-foreground truncate text-sm">
                              {order.customerName || "Anonymous"}
                            </div>
                            <div className="text-xs text-muted-foreground truncate max-w-[180px]">
                              {order.customerEmail}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3.5">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold border",
                          status.className
                        )}>
                          <span className="size-1.5 rounded-full bg-current animate-pulse" />
                          {status.label}
                        </span>
                      </TableCell>
                      <TableCell className="py-3.5 text-right tabular-nums font-medium text-muted-foreground">
                        {order.itemCount}
                      </TableCell>
                      <TableCell className="py-3.5 text-right tabular-nums font-bold text-foreground">
                        {formatMoney(order.total, order.currency)}
                      </TableCell>
                      <TableCell className="py-3.5 text-right text-xs text-muted-foreground">
                        {formatDate(order.createdAt)}
                      </TableCell>
                      <TableCell className="py-3.5 pr-4 text-right">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          asChild
                          className="opacity-0 group-hover/row:opacity-100 focus:opacity-100 transition-opacity hover:bg-primary/10 hover:text-primary size-7"
                        >
                          <Link href={`/admin/orders/${order.id}`}>
                            <IconArrowRight className="size-3.5" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

