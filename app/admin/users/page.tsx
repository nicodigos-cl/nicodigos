import type { Metadata } from "next";
import { AdminUsersBoard } from "@/components/admin/admin-users-board";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { getAdminUsers } from "@/lib/admin/users/queries";

export const metadata: Metadata = {
  title: "Clientes",
};

export default async function AdminUsersPage() {
  const users = await getAdminUsers();

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 md:space-y-8">
      <DashboardPageHeader
        title="Clientes"
        description="Cuentas registradas, roles y actividad de compra."
      />
      <AdminUsersBoard users={users} />
    </div>
  );
}
