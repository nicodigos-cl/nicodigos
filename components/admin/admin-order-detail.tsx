import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";
import { AdminRetryKinguinButton } from "@/components/admin/admin-retry-kinguin-button";
import { ManualFulfillmentPanel } from "@/components/admin/manual-fulfillment-panel";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";
import { OrderTransactionsCard } from "@/components/admin/order-transactions-card";
import type { AdminOrderDetail } from "@/lib/admin/orders/types";
import { formatDate, formatMoney } from "@/lib/admin/format";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type AdminOrderDetailViewProps = {
  order: AdminOrderDetail;
};

export function AdminOrderDetailView({ order }: AdminOrderDetailViewProps) {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit">
        <Link href="/admin/orders">
          <IconArrowLeft className="size-4" />
          Volver a pedidos
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            Pedido
          </h1>
          <p className="font-mono text-sm text-muted-foreground">{order.id}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <OrderStatusBadge status={order.status} className="text-sm" />
          {order.needsManualFulfillment ? (
            <Badge
              variant="outline"
              className="border-amber-500/40 text-amber-700 dark:text-amber-400"
            >
              Entrega manual
            </Badge>
          ) : null}
          {order.status === "PROCESSING" && !order.needsManualFulfillment ? (
            <AdminRetryKinguinButton orderId={order.id} />
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total</CardDescription>
            <CardTitle className="text-xl tabular-nums">
              {formatMoney(order.total, order.currency)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Subtotal {formatMoney(order.subtotal, order.currency)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Cliente</CardDescription>
            <CardTitle className="text-base">
              <Link
                href={`/admin/users/${order.customer.id}`}
                className="hover:text-primary hover:underline"
              >
                {order.customer.name}
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>{order.customer.email}</p>
            <p>Rol: {order.customer.role}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Fechas</CardDescription>
            <CardTitle className="text-base font-normal text-foreground">
              {formatDate(order.createdAt)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Actualizado {formatDate(order.updatedAt)}
          </CardContent>
        </Card>
      </div>

      <OrderTransactionsCard transactions={order.transactions} />

      <ManualFulfillmentPanel order={order} />

      {(order.kinguinOrderId ||
        order.isPreorder ||
        order.needsManualFulfillment) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Kinguin</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {order.kinguinOrderId ? (
              <p>
                <span className="text-muted-foreground">Order ID: </span>
                <span className="font-mono">{order.kinguinOrderId}</span>
              </p>
            ) : null}
            {order.kinguinStatus ? (
              <p>
                <span className="text-muted-foreground">Estado: </span>
                {order.kinguinStatus}
              </p>
            ) : (
              <p className="text-muted-foreground">
                Sin pedido en Kinguin todavía (revisa precio EUR y stock de keys
                texto).
              </p>
            )}
            {order.isPreorder ? (
              <Badge variant="outline">Preorder</Badge>
            ) : null}
            {order.preorderReleaseAt ? (
              <p className="text-muted-foreground">
                Lanzamiento: {formatDate(order.preorderReleaseAt)}
              </p>
            ) : null}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Ítems del pedido</CardTitle>
          <CardDescription>
            {order.items.length} línea{order.items.length === 1 ? "" : "s"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {order.items.map((item) => (
            <div
              key={item.id}
              className="space-y-3 rounded-xl border border-border p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Kinguin {item.kinguinProductId}
                    {item.productId ? (
                      <>
                        {" "}
                        ·{" "}
                        <Link
                          href={`/admin/products/${item.productId}/edit`}
                          className="text-primary hover:underline"
                        >
                          Editar producto
                        </Link>
                      </>
                    ) : null}
                  </p>
                </div>
                <p className="font-medium tabular-nums">
                  {formatMoney(item.lineTotal, order.currency)} ×{" "}
                  {item.quantity}
                </p>
              </div>
              {item.keys.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Key</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Serial</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {item.keys.map((key) => (
                      <TableRow key={key.id}>
                        <TableCell className="font-mono text-xs">
                          {key.kinguinKeyId}
                        </TableCell>
                        <TableCell>{key.status}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {key.serialMasked}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Sin claves registradas aún.
                </p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
