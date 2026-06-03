import * as React from "react";
import Link from "next/link";
import { LowStockList } from "@/components/admin/low-stock-list";
import { OrdersByStatus } from "@/components/admin/orders-by-status";
import { RecentOrdersTable } from "@/components/admin/recent-orders-table";
import { StatCard } from "@/components/admin/stat-card";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/admin/format";
import { getDashboardData } from "@/lib/admin/queries";
import {
  IconReportMoney,
  IconShoppingCart,
  IconPackage,
  IconUsers,
  IconShoppingBag,
  IconKey,
  IconPlus,
  IconExternalLink,
} from "@tabler/icons-react";

export default async function AdminPage() {
  const data = await getDashboardData();

  // Get current date formatted nicely
  const currentDate = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Capitalize first letter of weekday
  const formattedDate = currentDate.charAt(0).toUpperCase() + currentDate.slice(1);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 md:space-y-8">
      {/* Welcome header & Quick actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/10 pb-6">
        <div className="space-y-1.5">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Admin Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            {formattedDate} • Resumen de pedidos, catálogo e inventario.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild className="glass-card hover:bg-muted/40 border-border/40">
            <Link href="/" target="_blank" className="flex items-center gap-1.5">
              <IconExternalLink className="size-4" />
              Ver Tienda
            </Link>
          </Button>
          <Button size="sm" asChild className="shadow-sm">
            <Link href="/admin/products" className="flex items-center gap-1.5">
              <IconPlus className="size-4" />
              Nuevo Producto
            </Link>
          </Button>
        </div>
      </div>

      {/* Metrics Section */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Revenue"
          value={formatMoney(data.revenue)}
          description="Completed and processing orders"
          glowColor="emerald"
          icon={<IconReportMoney className="size-5" />}
          trend={{ value: "+12.4%", label: "vs last month", positive: true }}
        />
        <StatCard
          title="Orders today"
          value={String(data.ordersToday)}
          description="Since midnight"
          glowColor="indigo"
          icon={<IconShoppingCart className="size-5" />}
          trend={{ value: "+4.2%", label: "vs yesterday", positive: true }}
        />
        <StatCard
          title="Active products"
          value={String(data.activeProducts)}
          description={`${data.categories} categories`}
          glowColor="sky"
          icon={<IconPackage className="size-5" />}
        />
        <StatCard
          title="Users"
          value={String(data.users)}
          description="Registered accounts"
          glowColor="primary"
          icon={<IconUsers className="size-5" />}
        />
        <StatCard
          title="Open carts"
          value={String(data.openCarts)}
          description="Carts with at least one item"
          glowColor="amber"
          icon={<IconShoppingBag className="size-5" />}
        />
        <StatCard
          title="Pending keys"
          value={String(data.pendingKeys)}
          description="Awaiting delivery"
          glowColor="rose"
          icon={<IconKey className="size-5" />}
        />
      </section>

      {/* Charts & Tables Section */}
      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentOrdersTable orders={data.recentOrders} />
        </div>
        <div>
          <OrdersByStatus items={data.ordersByStatus} />
        </div>
      </section>

      {/* Inventory Alerts */}
      <LowStockList products={data.lowStockProducts} />
    </div>
  );
}

