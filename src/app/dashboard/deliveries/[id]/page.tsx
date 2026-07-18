import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { CustomerDeliveryCard } from "@/components/dashboard/customer-delivery-card";
import { CustomerStatusBadge } from "@/components/dashboard/customer-status-badge";
import { ResendDeliveryEmailButton } from "@/components/dashboard/resend-delivery-email-button";
import { SmmTargetForm } from "@/components/dashboard/smm-target-form";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress";
import { getSession } from "@/lib/auth/session";
import { formatCustomerDate } from "@/lib/customer-dashboard/format";
import {
  CUSTOMER_DELIVERIES_PATH,
  customerDeliverySupportPath,
  customerOrderPath,
} from "@/lib/customer-dashboard/paths";
import { getCustomerDeliveryDetail } from "@/lib/customer-dashboard/queries";
import {
  getCustomerDeliveryMethodLabel,
  getCustomerDeliveryStatusView,
} from "@/lib/customer-dashboard/status";

export const metadata: Metadata = {
  title: "Detalle de entrega",
};

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CustomerDeliveryDetailPage({
  params,
}: PageProps) {
  const session = await getSession();
  if (!session?.user) {
    redirect(`/auth/login?callbackUrl=${CUSTOMER_DELIVERIES_PATH}`);
  }

  const { id } = await params;
  const delivery = await getCustomerDeliveryDetail(id, session.user.id);
  if (!delivery) {
    notFound();
  }

  const statusView =
    delivery.smm?.statusView ?? getCustomerDeliveryStatusView(delivery.status);
  const methodLabel = getCustomerDeliveryMethodLabel(delivery.deliveryMethod);

  return (
    <div className="flex flex-col gap-8">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/dashboard" />}>
              Cuenta
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href={CUSTOMER_DELIVERIES_PATH} />}>
              Mis entregas
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{delivery.productName}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {delivery.productName}
          </h1>
          <p className="text-sm text-muted-foreground">
            Pedido #{delivery.orderNumber} · {methodLabel} ·{" "}
            {formatCustomerDate(
              delivery.deliveredAt ?? delivery.createdAt,
              "long",
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            <CustomerStatusBadge
              label={statusView.label}
              tone={statusView.tone}
            />
          </div>
          {statusView.description ? (
            <p className="max-w-2xl text-sm text-muted-foreground">
              {statusView.description}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            render={<Link href={customerOrderPath(delivery.orderId)} />}
            nativeButton={false}
          >
            Ver pedido
          </Button>
          <Button
            variant="outline"
            size="sm"
            render={
              <Link
                href={customerDeliverySupportPath(delivery.id, "delivery")}
              />
            }
            nativeButton={false}
          >
            Soporte
          </Button>
          {delivery.canResendEmail ? (
            <ResendDeliveryEmailButton deliveryId={delivery.id} />
          ) : null}
        </div>
      </div>

      {delivery.canSubmitTarget ? (
        <section className="space-y-3 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h2 className="font-heading text-lg font-semibold">
            Completar información
          </h2>
          <p className="text-sm text-muted-foreground">
            Necesitamos el enlace de destino para iniciar tu servicio.
          </p>
          <SmmTargetForm deliveryId={delivery.id} />
        </section>
      ) : null}

      {delivery.smm ? (
        <section className="space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h2 className="font-heading text-lg font-semibold">
            Detalles del servicio SMM
          </h2>
          <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Cantidad solicitada
              </dt>
              <dd className="mt-1 text-base font-semibold tabular-nums">
                {delivery.smm.quantity ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Cantidad inicial
              </dt>
              <dd className="mt-1 text-base font-semibold tabular-nums">
                {delivery.smm.startCount ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Cantidad restante
              </dt>
              <dd className="mt-1 text-base font-semibold tabular-nums text-primary">
                {delivery.smm.remains ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Destino
              </dt>
              <dd className="mt-1 text-base font-semibold">
                {delivery.smm.hasTarget ? "Configurado" : "Pendiente"}
              </dd>
            </div>
          </dl>
          {delivery.smm.progressPercent != null ? (
            <Progress value={delivery.smm.progressPercent} className="max-w-md">
              <ProgressLabel>Progreso del servicio</ProgressLabel>
              <ProgressValue>
                {(_formatted, value) =>
                  value != null ? `${Math.round(value)}%` : "—"
                }
              </ProgressValue>
            </Progress>
          ) : null}
        </section>
      ) : null}

      <CustomerDeliveryCard delivery={delivery} />
    </div>
  );
}
