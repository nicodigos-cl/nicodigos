import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { NotificationPreferences } from "@/components/dashboard/notification-preferences";
import { NotificationsSummary } from "@/components/dashboard/notifications/notifications-summary";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth/session";
import { getUserCommunicationPreferences } from "@/lib/communications/audience-queries";
import {
  CUSTOMER_NOTIFICATIONS_PATH,
  CUSTOMER_SECURITY_PATH,
} from "@/lib/customer-dashboard/paths";
import type { PreferenceInput } from "@/lib/validations/communications";

export const metadata: Metadata = {
  title: "Notificaciones",
};

function toPreferences(
  stored: Awaited<ReturnType<typeof getUserCommunicationPreferences>>,
): PreferenceInput {
  return {
    marketingEmail: stored?.marketingEmail ?? false,
    webPushEnabled: stored?.webPushEnabled ?? false,
    orders: stored?.orders ?? true,
    payments: stored?.payments ?? true,
    deliveries: stored?.deliveries ?? true,
    smm: stored?.smm ?? true,
    security: true,
    newProducts: stored?.newProducts ?? false,
    promotions: stored?.promotions ?? false,
  };
}

export default async function CustomerNotificationsPage() {
  const session = await getSession();
  if (!session?.user) {
    redirect(`/auth/login?callbackUrl=${CUSTOMER_NOTIFICATIONS_PATH}`);
  }

  const stored = await getUserCommunicationPreferences(session.user.id);
  const preferences = toPreferences(stored);

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/dashboard" />}>
              Cuenta
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Notificaciones</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Notificaciones
          </h1>
          <p className="text-sm text-muted-foreground">
            Controla los canales y categorías que deseas recibir.
          </p>
        </div>
        <Button
          variant="outline"
          render={<Link href={CUSTOMER_SECURITY_PATH} />}
          nativeButton={false}
          className="shrink-0"
        >
          Ir a Seguridad
        </Button>
      </div>

      <NotificationsSummary preferences={preferences} />

      <NotificationPreferences initial={preferences} />
    </div>
  );
}
