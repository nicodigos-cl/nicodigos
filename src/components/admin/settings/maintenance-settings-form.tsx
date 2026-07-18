"use client";

import { useState } from "react";

import {
  ConfirmationField,
  EnvStatusNote,
  SettingsField,
  SettingsFormShell,
  SettingsSectionHeader,
  SettingsSwitchRow,
  settingsInputClass,
  useDraft,
  useSettingsAction,
} from "@/components/admin/settings/settings-form-shared";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateMaintenanceSettingsAction } from "@/lib/actions/admin-settings";
import type { StoreSettingsDto } from "@/types/settings";
import type { StoreStatus } from "@/generated/prisma/client";

type MaintenanceDraft = Pick<
  StoreSettingsDto,
  | "version"
  | "storeStatus"
  | "maintenanceMessage"
  | "estimatedReturnAt"
  | "allowAdminDuringMaintenance"
  | "allowWebhooksDuringMaintenance"
  | "allowJobsDuringMaintenance"
  | "allowOngoingDeliveriesDuringMaintenance"
  | "maxQuantityPerProduct"
  | "maxProductsPerOrder"
  | "maxPaymentAttempts"
  | "deliveryRetryMax"
  | "keysLowStockThreshold"
  | "notifyPaymentFailed"
  | "notifyPaymentInconsistent"
  | "notifyDeliveryFailed"
  | "notifyPaidWithoutDelivery"
  | "notifyLowStock"
  | "notifyOutOfStock"
  | "notifySmmStuck"
  | "notifyProviderError"
  | "notifyWebhookFailed"
  | "notifyHighValueSale"
  | "highValueSaleThreshold"
  | "adminNotificationEmails"
>;

const STORE_STATUS_LABELS: Record<StoreStatus, string> = {
  OPEN: "Abierta",
  READ_ONLY: "Solo lectura",
  MAINTENANCE: "Mantenimiento",
  CLOSED: "Cerrada",
};

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDatetimeLocalValue(value: string): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function pickMaintenance(settings: StoreSettingsDto): MaintenanceDraft {
  return {
    version: settings.version,
    storeStatus: settings.storeStatus,
    maintenanceMessage: settings.maintenanceMessage,
    estimatedReturnAt: settings.estimatedReturnAt,
    allowAdminDuringMaintenance: settings.allowAdminDuringMaintenance,
    allowWebhooksDuringMaintenance: settings.allowWebhooksDuringMaintenance,
    allowJobsDuringMaintenance: settings.allowJobsDuringMaintenance,
    allowOngoingDeliveriesDuringMaintenance:
      settings.allowOngoingDeliveriesDuringMaintenance,
    maxQuantityPerProduct: settings.maxQuantityPerProduct,
    maxProductsPerOrder: settings.maxProductsPerOrder,
    maxPaymentAttempts: settings.maxPaymentAttempts,
    deliveryRetryMax: settings.deliveryRetryMax,
    keysLowStockThreshold: settings.keysLowStockThreshold,
    notifyPaymentFailed: settings.notifyPaymentFailed,
    notifyPaymentInconsistent: settings.notifyPaymentInconsistent,
    notifyDeliveryFailed: settings.notifyDeliveryFailed,
    notifyPaidWithoutDelivery: settings.notifyPaidWithoutDelivery,
    notifyLowStock: settings.notifyLowStock,
    notifyOutOfStock: settings.notifyOutOfStock,
    notifySmmStuck: settings.notifySmmStuck,
    notifyProviderError: settings.notifyProviderError,
    notifyWebhookFailed: settings.notifyWebhookFailed,
    notifyHighValueSale: settings.notifyHighValueSale,
    highValueSaleThreshold: settings.highValueSaleThreshold,
    adminNotificationEmails: settings.adminNotificationEmails,
  };
}

export function MaintenanceSettingsForm({
  settings,
}: {
  settings: StoreSettingsDto;
}) {
  const initial = pickMaintenance(settings);
  const { draft, setDraft, dirty } = useDraft(initial);
  const { pending, run } = useSettingsAction();
  const [confirmation, setConfirmation] = useState("");

  const enablingMaintenance =
    settings.storeStatus !== "MAINTENANCE" &&
    draft.storeStatus === "MAINTENANCE";

  return (
    <SettingsFormShell
      pending={pending}
      dirty={dirty}
      onSubmit={() => {
        run(
          () =>
            updateMaintenanceSettingsAction({
              ...draft,
              confirmation: enablingMaintenance ? confirmation : undefined,
            }),
          "Ajustes de mantenimiento guardados",
        );
      }}
    >
      <SettingsSectionHeader
        title="Mantenimiento"
        description="Modo mantenimiento, límites y notificaciones del equipo."
      />

      <EnvStatusNote>
        Durante mantenimiento, los webhooks de Flow deben permanecer activos para
        no perder confirmaciones de pago.
      </EnvStatusNote>

      <SettingsField label="Estado de la tienda">
        <select
          className={settingsInputClass}
          value={draft.storeStatus}
          onChange={(event) =>
            setDraft({
              ...draft,
              storeStatus: event.currentTarget.value as StoreStatus,
            })
          }
        >
          {(Object.keys(STORE_STATUS_LABELS) as StoreStatus[]).map((status) => (
            <option key={status} value={status}>
              {STORE_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </SettingsField>

      {enablingMaintenance ? (
        <ConfirmationField
          value={confirmation}
          onChange={setConfirmation}
          expected="ACTIVAR_MANTENIMIENTO"
          label="Confirmar activación de mantenimiento"
        />
      ) : null}

      <SettingsField label="Mensaje de mantenimiento">
        <Textarea
          className="min-h-20 max-w-xl rounded-xl"
          value={draft.maintenanceMessage ?? ""}
          onChange={(event) =>
            setDraft({
              ...draft,
              maintenanceMessage: event.currentTarget.value || null,
            })
          }
        />
      </SettingsField>

      <SettingsField label="Retorno estimado">
        <Input
          type="datetime-local"
          className={settingsInputClass}
          value={toDatetimeLocalValue(draft.estimatedReturnAt)}
          onChange={(event) =>
            setDraft({
              ...draft,
              estimatedReturnAt: fromDatetimeLocalValue(
                event.currentTarget.value,
              ),
            })
          }
        />
      </SettingsField>

      <SettingsSwitchRow
        label="Permitir acceso admin durante mantenimiento"
        checked={draft.allowAdminDuringMaintenance}
        onCheckedChange={(value) =>
          setDraft({ ...draft, allowAdminDuringMaintenance: value })
        }
      />

      <SettingsSwitchRow
        label="Permitir webhooks durante mantenimiento"
        hint="Recomendado mantener activo para callbacks de Flow."
        checked={draft.allowWebhooksDuringMaintenance}
        onCheckedChange={(value) =>
          setDraft({ ...draft, allowWebhooksDuringMaintenance: value })
        }
      />

      {!draft.allowWebhooksDuringMaintenance ? (
        <div
          role="alert"
          className="max-w-2xl rounded-xl border border-amber-500/40 bg-amber-500/5 px-4 py-3 text-sm text-muted-foreground"
        >
          Desactivar webhooks puede impedir confirmar pagos ya iniciados.
        </div>
      ) : null}

      <SettingsSwitchRow
        label="Permitir jobs durante mantenimiento"
        checked={draft.allowJobsDuringMaintenance}
        onCheckedChange={(value) =>
          setDraft({ ...draft, allowJobsDuringMaintenance: value })
        }
      />

      <SettingsSwitchRow
        label="Permitir entregas en curso durante mantenimiento"
        checked={draft.allowOngoingDeliveriesDuringMaintenance}
        onCheckedChange={(value) =>
          setDraft({
            ...draft,
            allowOngoingDeliveriesDuringMaintenance: value,
          })
        }
      />

      <fieldset className="space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
        <legend className="px-1 text-sm font-medium">Límites operativos</legend>

        <div className="grid max-w-xl gap-3 sm:grid-cols-2">
          <SettingsField label="Cantidad máxima por producto">
            <Input
              type="number"
              min={1}
              className={settingsInputClass}
              value={draft.maxQuantityPerProduct}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  maxQuantityPerProduct: Number(event.currentTarget.value),
                })
              }
            />
          </SettingsField>

          <SettingsField label="Productos máximos por pedido">
            <Input
              type="number"
              min={1}
              className={settingsInputClass}
              value={draft.maxProductsPerOrder}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  maxProductsPerOrder: Number(event.currentTarget.value),
                })
              }
            />
          </SettingsField>
        </div>

        <SettingsField label="Intentos máximos de pago">
          <Input
            type="number"
            min={1}
            className={settingsInputClass}
            value={draft.maxPaymentAttempts}
            onChange={(event) =>
              setDraft({
                ...draft,
                maxPaymentAttempts: Number(event.currentTarget.value),
              })
            }
          />
        </SettingsField>

        <SettingsField label="Reintentos máximos de entrega">
          <Input
            type="number"
            min={0}
            className={settingsInputClass}
            value={draft.deliveryRetryMax}
            onChange={(event) =>
              setDraft({
                ...draft,
                deliveryRetryMax: Number(event.currentTarget.value),
              })
            }
          />
        </SettingsField>

        <SettingsField label="Umbral de stock bajo (keys)">
          <Input
            type="number"
            min={0}
            className={settingsInputClass}
            value={draft.keysLowStockThreshold}
            onChange={(event) =>
              setDraft({
                ...draft,
                keysLowStockThreshold: Number(event.currentTarget.value),
              })
            }
          />
        </SettingsField>
      </fieldset>

      <fieldset className="space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
        <legend className="px-1 text-sm font-medium">
          Notificaciones del equipo
        </legend>

        <SettingsSwitchRow
          label="Notificar pago fallido"
          checked={draft.notifyPaymentFailed}
          onCheckedChange={(value) =>
            setDraft({ ...draft, notifyPaymentFailed: value })
          }
        />

        <SettingsSwitchRow
          label="Notificar pago inconsistente"
          checked={draft.notifyPaymentInconsistent}
          onCheckedChange={(value) =>
            setDraft({ ...draft, notifyPaymentInconsistent: value })
          }
        />

        <SettingsSwitchRow
          label="Notificar entrega fallida"
          checked={draft.notifyDeliveryFailed}
          onCheckedChange={(value) =>
            setDraft({ ...draft, notifyDeliveryFailed: value })
          }
        />

        <SettingsSwitchRow
          label="Notificar pagado sin entrega"
          checked={draft.notifyPaidWithoutDelivery}
          onCheckedChange={(value) =>
            setDraft({ ...draft, notifyPaidWithoutDelivery: value })
          }
        />

        <SettingsSwitchRow
          label="Notificar stock bajo"
          checked={draft.notifyLowStock}
          onCheckedChange={(value) =>
            setDraft({ ...draft, notifyLowStock: value })
          }
        />

        <SettingsSwitchRow
          label="Notificar sin stock"
          checked={draft.notifyOutOfStock}
          onCheckedChange={(value) =>
            setDraft({ ...draft, notifyOutOfStock: value })
          }
        />

        <SettingsSwitchRow
          label="Notificar SMM atascado"
          checked={draft.notifySmmStuck}
          onCheckedChange={(value) =>
            setDraft({ ...draft, notifySmmStuck: value })
          }
        />

        <SettingsSwitchRow
          label="Notificar error de proveedor"
          checked={draft.notifyProviderError}
          onCheckedChange={(value) =>
            setDraft({ ...draft, notifyProviderError: value })
          }
        />

        <SettingsSwitchRow
          label="Notificar webhook fallido"
          checked={draft.notifyWebhookFailed}
          onCheckedChange={(value) =>
            setDraft({ ...draft, notifyWebhookFailed: value })
          }
        />

        <SettingsSwitchRow
          label="Notificar venta de alto valor"
          checked={draft.notifyHighValueSale}
          onCheckedChange={(value) =>
            setDraft({ ...draft, notifyHighValueSale: value })
          }
        />

        <SettingsField label="Umbral venta de alto valor">
          <Input
            type="number"
            min={0}
            step="any"
            className={settingsInputClass}
            value={draft.highValueSaleThreshold ?? ""}
            onChange={(event) => {
              const value = event.currentTarget.value;
              setDraft({
                ...draft,
                highValueSaleThreshold: value === "" ? null : Number(value),
              });
            }}
          />
        </SettingsField>

        <SettingsField
          label="Emails de notificación admin"
          hint="Separados por coma"
        >
          <Input
            className={settingsInputClass}
            value={draft.adminNotificationEmails ?? ""}
            onChange={(event) =>
              setDraft({
                ...draft,
                adminNotificationEmails: event.currentTarget.value || null,
              })
            }
          />
        </SettingsField>
      </fieldset>
    </SettingsFormShell>
  );
}
