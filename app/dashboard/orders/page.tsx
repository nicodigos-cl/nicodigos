import type { Metadata } from "next";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { RecentOrdersList } from "@/components/dashboard/recent-orders-list";
import { requireUser } from "@/lib/dashboard/auth";
import { getUserOrders } from "@/lib/dashboard/queries";

export const metadata: Metadata = {
  title: "Pedidos",
};

export default async function DashboardOrdersPage() {
  const session = await requireUser();
  const orders = await getUserOrders(session.user.id);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 md:space-y-8">
      <DashboardPageHeader
        title="Mis pedidos"
        description="Historial completo de tus compras en nicodigos"
      />
      <RecentOrdersList orders={orders} />
    </div>
  );
}
