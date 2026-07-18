"use client";

import { useState, useTransition } from "react";
import { HiOutlineEye, HiOutlineEyeOff } from "react-icons/hi";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { revealDeliverySecretAction } from "@/lib/actions/deliveries";
import { formatDateTime } from "@/lib/format-date";
import type { DeliveryKinguinDto } from "@/types/deliveries";

function Row({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 border-b border-border py-2 text-sm last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="max-w-[60%] break-all text-right font-medium">{value}</dd>
    </div>
  );
}

function KeyRow({
  deliveryId,
  keyId,
  masked,
  label,
  type,
  externalKeyId,
}: {
  deliveryId: string;
  keyId: string;
  masked: string;
  label: string | null;
  type: string | null;
  externalKeyId: string | null;
}) {
  const [value, setValue] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <li className="rounded-xl border border-border p-3">
      <p className="text-sm font-medium">{label || type || "Key"}</p>
      {externalKeyId ? (
        <p className="text-xs text-muted-foreground">
          External: {externalKeyId}
        </p>
      ) : null}
      <div className="mt-2 flex items-center gap-2">
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
                const result = await revealDeliverySecretAction({
                  deliveryId,
                  kind: "key",
                  itemId: keyId,
                  field: "serial",
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
            void navigator.clipboard.writeText(value ?? masked);
            toast.success("Copiado");
          }}
        >
          Copiar
        </Button>
      </div>
    </li>
  );
}

export function DeliveryKinguinPanel({
  deliveryId,
  kinguin,
}: {
  deliveryId: string;
  kinguin: DeliveryKinguinDto;
}) {
  return (
    <div className="space-y-4">
      <dl>
        <Row label="Kinguin order ID" value={kinguin.kinguinOrderId} />
        <Row label="External order ID" value={kinguin.orderExternalId} />
        <Row label="Order ID remoto" value={kinguin.externalOrderId} />
        <Row label="Estado externo" value={kinguin.externalStatus} />
        <Row
          label="Request price EUR"
          value={kinguin.requestPriceEur}
        />
        <Row
          label="Última sync"
          value={
            kinguin.lastSyncedAt ? formatDateTime(kinguin.lastSyncedAt) : null
          }
        />
        <Row label="Error" value={kinguin.errorMessage} />
      </dl>
      <div>
        <h3 className="mb-2 text-sm font-medium">
          Keys recibidas ({kinguin.keys.length})
        </h3>
        {kinguin.keys.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin keys todavía.</p>
        ) : (
          <ul className="space-y-2">
            {kinguin.keys.map((key) => (
              <KeyRow
                key={key.id}
                deliveryId={deliveryId}
                keyId={key.id}
                masked={key.serialMasked}
                label={key.label}
                type={key.type}
                externalKeyId={key.externalKeyId}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
