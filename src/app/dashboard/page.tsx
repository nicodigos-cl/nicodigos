import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  HiOutlineCreditCard,
  HiOutlineShoppingBag,
  HiOutlineTruck,
} from "react-icons/hi";

import { BuyAgain } from "@/components/dashboard/buy-again";
import { CustomerAlerts } from "@/components/dashboard/customer-alerts";
import { CustomerMetrics } from "@/components/dashboard/customer-metrics";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { LatestOrderCard } from "@/components/dashboard/latest-order-card";
import { ProfileCompletionCard } from "@/components/dashboard/profile-completion-card";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentDeliveries } from "@/components/dashboard/recent-deliveries";
import { RecentOrders } from "@/components/dashboard/recent-orders";
import { TransactionSummary } from "@/components/dashboard/transaction-summary";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { getSession } from "@/lib/auth/session";
import { getCustomerDashboard } from "@/lib/customer-dashboard/queries";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/dashboard");
  }

  const dashboard = await getCustomerDashboard(session.user.id);
  const hasProblems = dashboard.alerts.some(
    (alert) => alert.tone === "danger" || alert.tone === "warning",
  );
  const prioritizeProfile = dashboard.profile.level !== "complete";

  if (dashboard.isNewCustomer) {
    return (
      <div className="flex flex-col gap-8">
        <DashboardHeader
          name={dashboard.user.name}
          hasProblems={hasProblems}
        />
        <CustomerAlerts alerts={dashboard.alerts} />

        <Empty className="border border-border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HiOutlineShoppingBag className="size-5" />
            </EmptyMedia>
            <EmptyTitle>Todavía no tienes pedidos</EmptyTitle>
            <EmptyDescription>
              Explora nuestro catálogo de productos digitales, cuentas, keys y
              servicios. Cuando compres, aquí verás el estado de tus pagos y
              entregas.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <div className="flex flex-wrap justify-center gap-2">
              <Button render={<Link href="/cart" />} nativeButton={false}>
                Explorar productos
              </Button>
              <Button
                variant="outline"
                render={<Link href="/dashboard/support" />}
                nativeButton={false}
              >
                Contactar soporte
              </Button>
            </div>
          </EmptyContent>
        </Empty>

        <QuickActions prioritizeProfile={prioritizeProfile} />
        <BuyAgain products={dashboard.buyAgain} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <DashboardHeader name={dashboard.user.name} hasProblems={hasProblems} />
      <CustomerAlerts alerts={dashboard.alerts} />
      <CustomerMetrics metrics={dashboard.metrics} />

      {dashboard.latestOrder ? (
        <LatestOrderCard order={dashboard.latestOrder} />
      ) : (
        <Empty className="border border-border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HiOutlineShoppingBag className="size-5" />
            </EmptyMedia>
            <EmptyTitle>Sin pedido reciente</EmptyTitle>
            <EmptyDescription>
              Cuando realices una compra, el pedido más reciente aparecerá aquí.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button render={<Link href="/cart" />} nativeButton={false}>
              Seguir comprando
            </Button>
          </EmptyContent>
        </Empty>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        {dashboard.deliveries.length > 0 ? (
          <RecentDeliveries deliveries={dashboard.deliveries} />
        ) : (
          <section className="space-y-3">
            <h2 className="font-heading text-lg font-semibold">
              Entregas recientes
            </h2>
            <Empty className="border border-border bg-card">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <HiOutlineTruck className="size-5" />
                </EmptyMedia>
                <EmptyTitle>Sin entregas recientes</EmptyTitle>
                <EmptyDescription>
                  Cuando una entrega esté lista, la verás aquí.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  variant="outline"
                  size="sm"
                  render={<Link href="/dashboard/deliveries" />}
                  nativeButton={false}
                >
                  Ver mis entregas
                </Button>
              </EmptyContent>
            </Empty>
          </section>
        )}

        {dashboard.recentOrders.length > 0 ? (
          <RecentOrders orders={dashboard.recentOrders} />
        ) : (
          <section className="space-y-3">
            <h2 className="font-heading text-lg font-semibold">
              Pedidos recientes
            </h2>
            <Empty className="border border-border bg-card">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <HiOutlineShoppingBag className="size-5" />
                </EmptyMedia>
                <EmptyTitle>Sin pedidos recientes</EmptyTitle>
                <EmptyDescription>
                  Todavía no hay pedidos para mostrar en este resumen.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  variant="outline"
                  size="sm"
                  render={<Link href="/dashboard/pedidos" />}
                  nativeButton={false}
                >
                  Ver mis pedidos
                </Button>
              </EmptyContent>
            </Empty>
          </section>
        )}
      </div>

      {dashboard.transactions.length > 0 ? (
        <TransactionSummary transactions={dashboard.transactions} />
      ) : (
        <section className="space-y-3">
          <h2 className="font-heading text-lg font-semibold">
            Transacciones recientes
          </h2>
          <Empty className="border border-border bg-card">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <HiOutlineCreditCard className="size-5" />
              </EmptyMedia>
              <EmptyTitle>Sin transacciones recientes</EmptyTitle>
              <EmptyDescription>
                Cuando inicies un pago, el historial aparecerá aquí.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button
                variant="outline"
                size="sm"
                render={<Link href="/dashboard/transactions" />}
                nativeButton={false}
              >
                Ver transacciones
              </Button>
            </EmptyContent>
          </Empty>
        </section>
      )}

      <ProfileCompletionCard profile={dashboard.profile} />
      <QuickActions prioritizeProfile={prioritizeProfile} />
      <BuyAgain products={dashboard.buyAgain} />
    </div>
  );
}
