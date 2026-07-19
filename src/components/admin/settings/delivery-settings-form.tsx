"use client";

import { useState } from "react";

import {
  ConfirmationField,
  SettingsField,
  SettingsFormShell,
  SettingsSectionHeader,
  SettingsSwitchRow,
  settingsInputClass,
  useDraft,
  useSettingsAction,
} from "@/components/admin/settings/settings-form-shared";
import { Input } from "@/components/ui/input";
import { updateDeliverySettingsAction } from "@/lib/actions/admin-settings";
import type { StoreSettingsDto } from "@/types/settings";

type DeliveryDraft = Pick<
  StoreSettingsDto,
  | "version"
  | "automaticDeliveryEnabled"
  | "manualDeliveryEnabled"
  | "autoSendAfterPayment"
  | "deliveryRetryMax"
  | "deliveryRetryIntervalMinutes"
  | "allowPartialDeliveries"
  | "allowEmailResend"
  | "requireRecentSessionForCredentials"
  | "sensitiveLinkExpirationMinutes"
  | "hideCredentialsByDefault"
  | "keysAutoAssign"
  | "keysReserveDuringCheckout"
  | "keysReserveDurationMinutes"
  | "keysLowStockThreshold"
  | "keysStockAlertsEnabled"
  | "keysAllowManualReplace"
  | "accountsAutoAssign"
  | "accountsRequireRecentSession"
  | "accountsHideCredentials"
  | "accountsAllowReplace"
  | "smmAutoSend"
  | "smmManualSend"
  | "smmMaxRetries"
  | "smmAllowPartials"
  | "smmValidateUrl"
  | "smmStuckAlertMinutes"
>;

function pickDelivery(settings: StoreSettingsDto): DeliveryDraft {
  return {
    version: settings.version,
    automaticDeliveryEnabled: settings.automaticDeliveryEnabled,
    manualDeliveryEnabled: settings.manualDeliveryEnabled,
    autoSendAfterPayment: settings.autoSendAfterPayment,
    deliveryRetryMax: settings.deliveryRetryMax,
    deliveryRetryIntervalMinutes: settings.deliveryRetryIntervalMinutes,
    allowPartialDeliveries: settings.allowPartialDeliveries,
    allowEmailResend: settings.allowEmailResend,
    requireRecentSessionForCredentials:
      settings.requireRecentSessionForCredentials,
    sensitiveLinkExpirationMinutes: settings.sensitiveLinkExpirationMinutes,
    hideCredentialsByDefault: settings.hideCredentialsByDefault,
    keysAutoAssign: settings.keysAutoAssign,
    keysReserveDuringCheckout: settings.keysReserveDuringCheckout,
    keysReserveDurationMinutes: settings.keysReserveDurationMinutes,
    keysLowStockThreshold: settings.keysLowStockThreshold,
    keysStockAlertsEnabled: settings.keysStockAlertsEnabled,
    keysAllowManualReplace: settings.keysAllowManualReplace,
    accountsAutoAssign: settings.accountsAutoAssign,
    accountsRequireRecentSession: settings.accountsRequireRecentSession,
    accountsHideCredentials: settings.accountsHideCredentials,
    accountsAllowReplace: settings.accountsAllowReplace,
    smmAutoSend: settings.smmAutoSend,
    smmManualSend: settings.smmManualSend,
    smmMaxRetries: settings.smmMaxRetries,
    smmAllowPartials: settings.smmAllowPartials,
    smmValidateUrl: settings.smmValidateUrl,
    smmStuckAlertMinutes: settings.smmStuckAlertMinutes,
  };
}

export function DeliverySettingsForm({
  settings,
}: {
  settings: StoreSettingsDto;
}) {
  const initial = pickDelivery(settings);
  const { draft, setDraft, dirty } = useDraft(initial);
  const { pending, run } = useSettingsAction();
  const [confirmation, setConfirmation] = useState("");

  const needsDisableConfirm =
    settings.automaticDeliveryEnabled && !draft.automaticDeliveryEnabled;

  return (
    <SettingsFormShell
      pending={pending}
      dirty={dirty}
      onSubmit={() => {
        run(
          () =>
            updateDeliverySettingsAction({
              ...draft,
              confirmation: needsDisableConfirm ? confirmation : undefined,
            }),
          "Ajustes de entregas guardados",
        );
      }}
    >
      <SettingsSectionHeader
        title="Entregas"
        description="Keys, cuentas, SMM y revelación de credenciales."
      />

      <fieldset className="space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
        <legend className="px-1 text-sm font-medium">Entregas generales</legend>

        <SettingsSwitchRow
          label="Entregas automáticas"
          checked={draft.automaticDeliveryEnabled}
          onCheckedChange={(value) =>
            setDraft({ ...draft, automaticDeliveryEnabled: value })
          }
        />

        {needsDisableConfirm ? (
          <ConfirmationField
            value={confirmation}
            onChange={setConfirmation}
            expected="DESACTIVAR_ENTREGAS_AUTO"
            label="Confirmar desactivación de entregas automáticas"
          />
        ) : null}

        <SettingsSwitchRow
          label="Entregas manuales"
          checked={draft.manualDeliveryEnabled}
          onCheckedChange={(value) =>
            setDraft({ ...draft, manualDeliveryEnabled: value })
          }
        />

        <SettingsSwitchRow
          label="Enviar automáticamente tras el pago"
          checked={draft.autoSendAfterPayment}
          onCheckedChange={(value) =>
            setDraft({ ...draft, autoSendAfterPayment: value })
          }
        />

        <div className="grid max-w-xl gap-3 sm:grid-cols-2">
          <SettingsField label="Reintentos máximos">
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

          <SettingsField label="Intervalo entre reintentos (min)">
            <Input
              type="number"
              min={1}
              className={settingsInputClass}
              value={draft.deliveryRetryIntervalMinutes}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  deliveryRetryIntervalMinutes: Number(
                    event.currentTarget.value,
                  ),
                })
              }
            />
          </SettingsField>
        </div>

        <SettingsSwitchRow
          label="Permitir entregas parciales"
          checked={draft.allowPartialDeliveries}
          onCheckedChange={(value) =>
            setDraft({ ...draft, allowPartialDeliveries: value })
          }
        />

        <SettingsSwitchRow
          label="Permitir reenvío por email"
          checked={draft.allowEmailResend}
          onCheckedChange={(value) =>
            setDraft({ ...draft, allowEmailResend: value })
          }
        />

        <SettingsSwitchRow
          label="Exigir sesión reciente para credenciales"
          checked={draft.requireRecentSessionForCredentials}
          onCheckedChange={(value) =>
            setDraft({
              ...draft,
              requireRecentSessionForCredentials: value,
            })
          }
        />

        <SettingsField label="Expiración de enlace sensible (min)">
          <Input
            type="number"
            min={5}
            className={settingsInputClass}
            value={draft.sensitiveLinkExpirationMinutes}
            onChange={(event) =>
              setDraft({
                ...draft,
                sensitiveLinkExpirationMinutes: Number(
                  event.currentTarget.value,
                ),
              })
            }
          />
        </SettingsField>

        <SettingsSwitchRow
          label="Ocultar credenciales por defecto"
          checked={draft.hideCredentialsByDefault}
          onCheckedChange={(value) =>
            setDraft({ ...draft, hideCredentialsByDefault: value })
          }
        />
      </fieldset>

      <fieldset className="space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
        <legend className="px-1 text-sm font-medium">Keys</legend>

        <SettingsSwitchRow
          label="Asignación automática de keys"
          checked={draft.keysAutoAssign}
          onCheckedChange={(value) =>
            setDraft({ ...draft, keysAutoAssign: value })
          }
        />

        <SettingsSwitchRow
          label="Reservar keys durante checkout"
          checked={draft.keysReserveDuringCheckout}
          onCheckedChange={(value) =>
            setDraft({ ...draft, keysReserveDuringCheckout: value })
          }
        />

        <SettingsField label="Duración de reserva (min)">
          <Input
            type="number"
            min={1}
            className={settingsInputClass}
            value={draft.keysReserveDurationMinutes}
            onChange={(event) =>
              setDraft({
                ...draft,
                keysReserveDurationMinutes: Number(event.currentTarget.value),
              })
            }
          />
        </SettingsField>

        <SettingsField label="Umbral de stock bajo">
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

        <SettingsSwitchRow
          label="Alertas de stock bajo"
          checked={draft.keysStockAlertsEnabled}
          onCheckedChange={(value) =>
            setDraft({ ...draft, keysStockAlertsEnabled: value })
          }
        />

        <SettingsSwitchRow
          label="Permitir reemplazo manual de keys"
          checked={draft.keysAllowManualReplace}
          onCheckedChange={(value) =>
            setDraft({ ...draft, keysAllowManualReplace: value })
          }
        />
      </fieldset>

      <fieldset className="space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
        <legend className="px-1 text-sm font-medium">Cuentas</legend>

        <SettingsSwitchRow
          label="Asignación automática de cuentas"
          checked={draft.accountsAutoAssign}
          onCheckedChange={(value) =>
            setDraft({ ...draft, accountsAutoAssign: value })
          }
        />

        <SettingsSwitchRow
          label="Exigir sesión reciente (cuentas)"
          checked={draft.accountsRequireRecentSession}
          onCheckedChange={(value) =>
            setDraft({ ...draft, accountsRequireRecentSession: value })
          }
        />

        <SettingsSwitchRow
          label="Ocultar credenciales de cuentas"
          checked={draft.accountsHideCredentials}
          onCheckedChange={(value) =>
            setDraft({ ...draft, accountsHideCredentials: value })
          }
        />

        <SettingsSwitchRow
          label="Permitir reemplazo de cuentas"
          checked={draft.accountsAllowReplace}
          onCheckedChange={(value) =>
            setDraft({ ...draft, accountsAllowReplace: value })
          }
        />
      </fieldset>

      <fieldset className="space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
        <legend className="px-1 text-sm font-medium">SMM</legend>

        <SettingsSwitchRow
          label="Envío automático SMM"
          checked={draft.smmAutoSend}
          onCheckedChange={(value) =>
            setDraft({ ...draft, smmAutoSend: value })
          }
        />

        <SettingsSwitchRow
          label="Envío manual SMM"
          checked={draft.smmManualSend}
          onCheckedChange={(value) =>
            setDraft({ ...draft, smmManualSend: value })
          }
        />

        <SettingsField label="Reintentos máximos SMM">
          <Input
            type="number"
            min={0}
            className={settingsInputClass}
            value={draft.smmMaxRetries}
            onChange={(event) =>
              setDraft({
                ...draft,
                smmMaxRetries: Number(event.currentTarget.value),
              })
            }
          />
        </SettingsField>

        <SettingsSwitchRow
          label="Permitir parciales SMM"
          checked={draft.smmAllowPartials}
          onCheckedChange={(value) =>
            setDraft({ ...draft, smmAllowPartials: value })
          }
        />

        <SettingsSwitchRow
          label="Validar URL SMM"
          checked={draft.smmValidateUrl}
          onCheckedChange={(value) =>
            setDraft({ ...draft, smmValidateUrl: value })
          }
        />

        <SettingsField label="Alerta SMM atascado (min)">
          <Input
            type="number"
            min={15}
            className={settingsInputClass}
            value={draft.smmStuckAlertMinutes}
            onChange={(event) =>
              setDraft({
                ...draft,
                smmStuckAlertMinutes: Number(event.currentTarget.value),
              })
            }
          />
        </SettingsField>
      </fieldset>
    </SettingsFormShell>
  );
}
