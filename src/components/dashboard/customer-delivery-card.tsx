"use client";

import { useState, useTransition } from "react";
import { HiOutlineEye, HiOutlineEyeOff } from "react-icons/hi";
import { toast } from "sonner";

import { CustomerStatusBadge } from "@/components/dashboard/customer-status-badge";
import { Button } from "@/components/ui/button";
import { revealCustomerDeliverySecretAction } from "@/lib/actions/deliveries";
import { formatCustomerDate } from "@/lib/customer-dashboard/format";
import { getCustomerDeliveryStatusView } from "@/lib/customer-dashboard/status";
import { deliveryContentTypeLabel } from "@/lib/validations/deliveries";
import type { CustomerDeliveryDto } from "@/types/deliveries";

function CustomerSecret({
  deliveryId,
  kind,
  itemId,
  field,
  masked,
}: {
  deliveryId: string;
  kind: "key" | "credential";
  itemId: string;
  field?: "serial" | "password" | "token";
  masked: string;
}) {
  const [value, setValue] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex w-full items-center gap-2 rounded-xl border border-border bg-muted/40 p-2">
      <code className="min-w-0 flex-1 truncate px-1 font-mono text-xs text-foreground select-all">
        {value ?? masked}
      </code>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label={value ? "Ocultar" : "Revelar"}
          disabled={pending}
          onClick={() => {
            if (value) {
              setValue(null);
              return;
            }
            startTransition(() => {
              void (async () => {
                const result = await revealCustomerDeliverySecretAction({
                  deliveryId,
                  kind,
                  itemId,
                  field,
                });
                if (!result.success) {
                  toast.error(result.message);
                  return;
                }
                setValue(result.data.value);
              })();
            });
          }}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          {value ? (
            <HiOutlineEyeOff className="size-4" />
          ) : (
            <HiOutlineEye className="size-4" />
          )}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            if (!value) {
              toast.message("Revela el valor antes de copiarlo");
              return;
            }
            void navigator.clipboard.writeText(value);
            toast.success("Copiado");
          }}
          className="h-8 px-3 text-xs font-semibold"
        >
          Copiar
        </Button>
      </div>
    </div>
  );
}

export function CustomerDeliveryCard({
  delivery,
}: {
  delivery: CustomerDeliveryDto;
}) {
  const statusView = getCustomerDeliveryStatusView(delivery.status);

  return (
    <section className="space-y-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div className="space-y-1">
          <span className="font-mono text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
            Contenido de la entrega
          </span>
          <h2 className="font-heading text-lg font-semibold leading-none text-foreground">
            {delivery.productName}
          </h2>
        </div>
        <CustomerStatusBadge
          label={statusView.label}
          tone={statusView.tone}
        />
      </div>

      <div className="grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <span className="block text-xs text-muted-foreground">Cantidad</span>
          <span className="font-medium text-foreground">{delivery.quantity}</span>
        </div>
        {delivery.deliveredAt ? (
          <div>
            <span className="block text-xs text-muted-foreground">
              Fecha de entrega
            </span>
            <span className="font-medium text-foreground">
              {formatCustomerDate(delivery.deliveredAt, "long")}
            </span>
          </div>
        ) : null}
      </div>

      {delivery.customerMessage ? (
        <div className="rounded-xl border border-border/80 bg-muted/30 p-4">
          <span className="mb-1 block text-xs font-semibold text-muted-foreground">
            Nota de entrega
          </span>
          <p className="text-sm text-foreground">{delivery.customerMessage}</p>
        </div>
      ) : null}

      {delivery.status === "DELIVERED" ? (
        <div className="space-y-4 pt-2">
          <h3 className="font-heading text-base font-semibold text-foreground">
            Contenido entregado
          </h3>
          <div className="grid gap-4">
            {delivery.keys.map((key) => (
              <div
                key={key.id}
                className="space-y-3 rounded-xl border border-border bg-card p-4"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {key.label || deliveryContentTypeLabel[key.contentType]}
                  </p>
                </div>
                <CustomerSecret
                  deliveryId={delivery.id}
                  kind="key"
                  itemId={key.id}
                  field="serial"
                  masked={key.serialMasked}
                />
                {key.instructions ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {key.instructions}
                  </p>
                ) : null}
              </div>
            ))}

            {delivery.credentials.map((cred) => (
              <div
                key={cred.id}
                className="space-y-4 rounded-xl border border-border bg-card p-4"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {cred.label || deliveryContentTypeLabel[cred.contentType]}
                  </p>
                </div>

                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  {cred.username ? (
                    <div>
                      <span className="block text-xs text-muted-foreground">
                        Usuario
                      </span>
                      <span className="font-medium text-foreground select-all">
                        {cred.username}
                      </span>
                    </div>
                  ) : null}
                  {cred.email ? (
                    <div>
                      <span className="block text-xs text-muted-foreground">
                        Email
                      </span>
                      <span className="font-medium text-foreground select-all">
                        {cred.email}
                      </span>
                    </div>
                  ) : null}
                  {cred.url ? (
                    <div className="sm:col-span-2">
                      <span className="block text-xs text-muted-foreground">
                        URL de acceso
                      </span>
                      <a
                        href={cred.url}
                        target="_blank"
                        rel="noreferrer"
                        className="break-all text-sm font-medium text-primary hover:underline"
                      >
                        {cred.url}
                      </a>
                    </div>
                  ) : null}
                </div>

                {cred.hasPassword ? (
                  <div className="space-y-1.5">
                    <span className="block text-xs text-muted-foreground">
                      Contraseña
                    </span>
                    <CustomerSecret
                      deliveryId={delivery.id}
                      kind="credential"
                      itemId={cred.id}
                      field="password"
                      masked={cred.passwordMasked ?? "••••"}
                    />
                  </div>
                ) : null}

                {cred.hasToken ? (
                  <div className="space-y-1.5">
                    <span className="block text-xs text-muted-foreground">
                      Token / Token de acceso
                    </span>
                    <CustomerSecret
                      deliveryId={delivery.id}
                      kind="credential"
                      itemId={cred.id}
                      field="token"
                      masked={cred.tokenMasked ?? "••••"}
                    />
                  </div>
                ) : null}

                {cred.instructions || cred.notes ? (
                  <div className="border-t border-border pt-3">
                    <span className="mb-1 block text-xs font-semibold text-muted-foreground">
                      Instrucciones
                    </span>
                    <p className="text-xs leading-normal text-muted-foreground">
                      {cred.instructions || cred.notes}
                    </p>
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          {delivery.keys.length === 0 && delivery.credentials.length === 0 ? (
            <div className="rounded-xl border border-yellow-200/50 bg-yellow-500/5 p-4 text-sm text-yellow-800 dark:border-yellow-900/30 dark:bg-yellow-950/10 dark:text-yellow-400">
              Entrega marcada como completada. Si esperabas contenido digital,
              por favor contacta soporte.
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          El contenido digital se mostrará de forma segura en esta sección una
          vez que tu entrega sea procesada.
        </div>
      )}

      {delivery.events.length > 0 ? (
        <div className="space-y-4 border-t border-border pt-5">
          <h3 className="font-heading text-sm font-semibold text-foreground">
            Historial de actividad
          </h3>
          <div className="relative ml-2.5 space-y-5 border-l border-border pl-6">
            {delivery.events.map((event) => (
              <div key={event.id} className="relative">
                <span className="absolute -left-[31px] top-1 flex size-2.5 items-center justify-center rounded-full bg-border ring-4 ring-background" />
                <p className="text-xs font-medium text-muted-foreground">
                  {formatCustomerDate(event.createdAt, "long")}
                </p>
                <p className="mt-0.5 text-sm font-medium text-foreground">
                  {event.message || event.status}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
