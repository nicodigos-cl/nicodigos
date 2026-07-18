import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { CustomerDeliveryCard } from "@/components/dashboard/customer-delivery-card";
import { CustomerStatusBadge } from "@/components/dashboard/customer-status-badge";
import { ResendDeliveryEmailButton } from "@/components/dashboard/resend-delivery-email-button";
import { SmmTargetForm } from "@/components/dashboard/smm-target-form";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth/session";
import { getCustomerDeliveryDetail } from "@/lib/customer-dashboard/queries";
import { formatDateTime } from "@/lib/format-date";

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
    redirect("/auth/login?callbackUrl=/dashboard/deliveries");
  }

  const { id } = await params;
  const delivery = await getCustomerDeliveryDetail(id, session.user.id);
  if (!delivery) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {delivery.productName}
          </h1>
          <p className="text-sm text-muted-foreground">
            Pedido {delivery.orderNumber} ·{" "}
            {formatDateTime(delivery.deliveredAt ?? delivery.createdAt)}
          </p>
          <div className="flex flex-wrap gap-2">
            <CustomerStatusBadge
              label={
                delivery.smm?.statusView.label ??
                (delivery.status === "DELIVERED"
                  ? "Entrega disponible"
                  : delivery.status === "FAILED"
                    ? "Requiere revisión"
                    : delivery.status === "PROCESSING"
                      ? "En proceso"
                      : "En preparación")
              }
              tone={
                delivery.smm?.statusView.tone ??
                (delivery.status === "DELIVERED"
                  ? "success"
                  : delivery.status === "FAILED"
                    ? "danger"
                    : delivery.status === "PROCESSING"
                      ? "info"
                      : "warning")
              }
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`/dashboard/pedidos/${delivery.orderId}`} />}
            nativeButton={false}
          >
            Ver pedido
          </Button>
          <Button
            variant="outline"
            size="sm"
            render={
              <Link href={`/dashboard/support?deliveryId=${delivery.id}`} />
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
        <section className="space-y-3">
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
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4">
          <h2 className="font-heading text-lg font-bold text-foreground">Detalles del Servicio SMM</h2>
          <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4 bg-muted/20 border border-border/80 rounded-xl p-4">
            <div>
              <dt className="text-xs text-muted-foreground uppercase font-semibold">Cantidad solicitada</dt>
              <dd className="mt-1 text-base font-bold text-foreground tabular-nums">
                {delivery.smm.quantity ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase font-semibold">Cantidad inicial</dt>
              <dd className="mt-1 text-base font-bold text-foreground tabular-nums">
                {delivery.smm.startCount ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase font-semibold">Cantidad restante</dt>
              <dd className="mt-1 text-base font-bold text-foreground tabular-nums font-mono text-primary">
                {delivery.smm.remains ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase font-semibold">Destino</dt>
              <dd className="mt-1 text-base font-bold text-foreground">
                {delivery.smm.hasTarget ? (
                  <span className="text-emerald-600 dark:text-emerald-400">Configurado</span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400">Pendiente</span>
                )}
              </dd>
            </div>
          </dl>
          {delivery.smm.progressPercent != null ? (
            <div className="pt-2">
              <div
                className="h-2.5 overflow-hidden rounded-full bg-muted border border-border/20"
                role="progressbar"
                aria-valuenow={Math.round(delivery.smm.progressPercent)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Progreso del servicio"
              >
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${delivery.smm.progressPercent}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs font-semibold text-muted-foreground">
                {Math.round(delivery.smm.progressPercent)}% completado
              </p>
            </div>
          ) : null}
        </section>
      ) : null}

      <CustomerDeliveryCard delivery={delivery} />
    </div>
  );
}
