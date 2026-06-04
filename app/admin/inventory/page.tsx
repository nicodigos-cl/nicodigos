import type { Metadata } from "next";
import { AdminInventoryBoard } from "@/components/admin/admin-inventory-board";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import {
  getAdminLowStockProducts,
  getLowStockThreshold,
} from "@/lib/admin/inventory/queries";

export const metadata: Metadata = {
  title: "Inventario",
};

export default async function AdminInventoryPage() {
  const [products, threshold] = await Promise.all([
    getAdminLowStockProducts(),
    Promise.resolve(getLowStockThreshold()),
  ]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 md:space-y-8">
      <DashboardPageHeader
        title="Inventario"
        description={`Productos con menos de ${threshold} unidades en stock.`}
      />
      <AdminInventoryBoard products={products} threshold={threshold} />
    </div>
  );
}
