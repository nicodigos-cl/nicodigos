import { DashboardAlerts } from "@/components/admin/dashboard/dashboard-alerts";
import { DashboardHeader } from "@/components/admin/dashboard/dashboard-header";
import { DashboardLists } from "@/components/admin/dashboard/dashboard-lists";
import { DashboardMetrics } from "@/components/admin/dashboard/dashboard-metrics";
import { DashboardOperationalPanels } from "@/components/admin/dashboard/dashboard-operational";
import { DeliveryMethodChart } from "@/components/admin/dashboard/delivery-method-chart";
import { FinanceSummary } from "@/components/admin/dashboard/finance-summary";
import { SalesChart } from "@/components/admin/dashboard/sales-chart";
import type { AdminDashboardDto } from "@/types/dashboard";

export function DashboardView({ data }: { data: AdminDashboardDto }) {
  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader data={data} />
      <DashboardAlerts alerts={data.alerts} />
      <DashboardMetrics
        metrics={data.metrics}
        marginPercentage={data.finance.marginPercentage}
      />
      <FinanceSummary finance={data.finance} currency={data.currency} />
      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <SalesChart data={data.salesSeries} currency={data.currency} />
        <DeliveryMethodChart
          data={data.salesByDeliveryMethod}
          currency={data.currency}
        />
      </div>
      <DashboardOperationalPanels data={data} />
      <DashboardLists data={data} />
    </div>
  );
}
