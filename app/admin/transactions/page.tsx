import type { Metadata } from "next";
import { AdminTransactionsBoard } from "@/components/admin/admin-transactions-board";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import {
  getAdminTransactionSummary,
  getAdminTransactions,
} from "@/lib/admin/transactions/queries";

export const metadata: Metadata = {
  title: "Transacciones",
};

export default async function AdminTransactionsPage() {
  const [transactions, summary] = await Promise.all([
    getAdminTransactions(),
    getAdminTransactionSummary(),
  ]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 md:space-y-8">
      <DashboardPageHeader
        title="Transacciones"
        description="Libro de cobros, reembolsos y pagos a proveedores en CLP."
      />
      <AdminTransactionsBoard transactions={transactions} summary={summary} />
    </div>
  );
}
