import { LowStockList } from "@/components/admin/low-stock-list";
import { OrdersByStatus } from "@/components/admin/orders-by-status";
import { RecentOrdersTable } from "@/components/admin/recent-orders-table";
import { StatCard } from "@/components/admin/stat-card";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { formatMoney } from "@/lib/admin/format";
import { getDashboardData } from "@/lib/admin/queries";

export default async function AdminPage() {
  const data = await getDashboardData();

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 md:space-y-8">
      <DashboardPageHeader
        title="Dashboard"
        description="Resumen de pedidos, catálogo e inventario."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title="Revenue"
          value={formatMoney(data.revenue)}
          description="Completed and processing orders"
        />
        <StatCard
          title="Orders today"
          value={String(data.ordersToday)}
          description="Since midnight"
        />
        <StatCard
          title="Active products"
          value={String(data.activeProducts)}
          description={`${data.categories} categories`}
        />
        <StatCard
          title="Users"
          value={String(data.users)}
          description="Registered accounts"
        />
        <StatCard
          title="Open carts"
          value={String(data.openCarts)}
          description="Carts with at least one item"
        />
        <StatCard
          title="Pending keys"
          value={String(data.pendingKeys)}
          description="Awaiting delivery"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <RecentOrdersTable orders={data.recentOrders} />
        <OrdersByStatus items={data.ordersByStatus} />
      </section>

      <LowStockList products={data.lowStockProducts} />
    </div>
  );
}
