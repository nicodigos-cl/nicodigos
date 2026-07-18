"use client";

import { useState, useTransition } from "react";
import { HiOutlineEye, HiOutlineEyeOff } from "react-icons/hi";
import { toast } from "sonner";

import { DeliveryStatusBadge } from "@/components/admin/deliveries/delivery-status-badge";
import { Button } from "@/components/ui/button";
import { revealCustomerDeliverySecretAction } from "@/lib/actions/deliveries";
import { formatDateTime } from "@/lib/format-date";
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
    <div className="flex items-center gap-2">
      <code className="min-w-0 flex-1 truncate rounded-lg bg-muted px-2 py-1 text-xs">
        {value ?? masked}
      </code>
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
      >
        Copiar
      </Button>
    </div>
  );
}

export function CustomerDeliveryCard({
  delivery,
}: {
  delivery: CustomerDeliveryDto;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-medium">{delivery.productName}</h2>
        <DeliveryStatusBadge status={delivery.status} />
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Cantidad {delivery.quantity}
        {delivery.deliveredAt
          ? ` · Entregada ${formatDateTime(delivery.deliveredAt)}`
          : ""}
      </p>

      {delivery.customerMessage ? (
        <p className="mt-3 rounded-xl bg-muted/60 px-3 py-2 text-sm">
          {delivery.customerMessage}
        </p>
      ) : null}

      {delivery.status === "DELIVERED" ? (
        <div className="mt-4 space-y-3">
          {delivery.keys.map((key) => (
            <div key={key.id} className="rounded-xl border border-border p-3">
              <p className="text-sm font-medium">
                {key.label || deliveryContentTypeLabel[key.contentType]}
              </p>
              <div className="mt-2">
                <CustomerSecret
                  deliveryId={delivery.id}
                  kind="key"
                  itemId={key.id}
                  field="serial"
                  masked={key.serialMasked}
                />
              </div>
              {key.instructions ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  {key.instructions}
                </p>
              ) : null}
            </div>
          ))}
          {delivery.credentials.map((cred) => (
            <div key={cred.id} className="space-y-2 rounded-xl border border-border p-3">
              <p className="text-sm font-medium">
                {cred.label || deliveryContentTypeLabel[cred.contentType]}
              </p>
              {cred.username ? (
                <p className="text-sm">Usuario: {cred.username}</p>
              ) : null}
              {cred.email ? <p className="text-sm">Email: {cred.email}</p> : null}
              {cred.url ? (
                <p className="break-all text-sm">
                  URL:{" "}
                  <a href={cred.url} className="text-primary hover:underline">
                    {cred.url}
                  </a>
                </p>
              ) : null}
              {cred.hasPassword ? (
                <CustomerSecret
                  deliveryId={delivery.id}
                  kind="credential"
                  itemId={cred.id}
                  field="password"
                  masked={cred.passwordMasked ?? "••••"}
                />
              ) : null}
              {cred.hasToken ? (
                <CustomerSecret
                  deliveryId={delivery.id}
                  kind="credential"
                  itemId={cred.id}
                  field="token"
                  masked={cred.tokenMasked ?? "••••"}
                />
              ) : null}
              {cred.instructions || cred.notes ? (
                <p className="text-xs text-muted-foreground">
                  {cred.instructions || cred.notes}
                </p>
              ) : null}
            </div>
          ))}
          {delivery.keys.length === 0 && delivery.credentials.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Entrega marcada como completada. Si esperabas contenido digital,
              contacta soporte.
            </p>
          ) : null}
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          El contenido se mostrará aquí cuando la entrega esté lista.
        </p>
      )}

      {delivery.events.length > 0 ? (
        <div className="mt-6">
          <h3 className="text-sm font-medium">Actividad</h3>
          <ol className="mt-2 space-y-2 border-l border-border pl-3">
            {delivery.events.map((event) => (
              <li key={event.id} className="text-sm">
                <span className="text-muted-foreground">
                  {formatDateTime(event.createdAt)}
                </span>
                {" · "}
                {event.message || event.status}
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </section>
  );
}
