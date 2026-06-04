import type { Metadata } from "next";
import { AdminOrdersBoard } from "@/components/admin/admin-orders-board";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { getAdminOrders } from "@/lib/admin/orders/queries";

export const metadata: Metadata = {
  title: "Pedidos",
};

export default async function AdminOrdersPage() {
  const orders = await getAdminOrders();

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 md:space-y-8">
      <DashboardPageHeader
        title="Pedidos"
        description="Historial de compras, estados y claves entregadas."
      />
      <AdminOrdersBoard orders={orders} />
    </div>
  );
}
