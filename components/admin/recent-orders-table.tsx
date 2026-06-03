import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

type RecentOrdersTableProps = {
  orders: DashboardData["recentOrders"];
};

const statusVariant: Record<
  OrderStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  PENDING: "outline",
  PROCESSING: "secondary",
  COMPLETED: "default",
  CANCELED: "destructive",
  REFUNDED: "destructive",
};

export function RecentOrdersTable({ orders }: RecentOrdersTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent orders</CardTitle>
        <CardDescription>Latest 10 orders across the store</CardDescription>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No orders yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <div className="font-medium">{order.customerName}</div>
                    <div className="text-xs text-muted-foreground">
                      {order.customerEmail}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[order.status]}>
                      {formatOrderStatus(order.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {order.itemCount}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(order.total, order.currency)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatDate(order.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
