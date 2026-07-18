"use client";

import { useState } from "react";

import { TestConnectionButton } from "@/components/admin/settings/test-connection-button";
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
import { updatePaymentSettingsAction } from "@/lib/actions/admin-settings";
import type { StoreSettingsDto } from "@/types/settings";

type PaymentDraft = Pick<
  StoreSettingsDto,
  | "version"
  | "flowEnabled"
  | "acceptedCurrency"
  | "refundsEnabled"
  | "minPaymentAmount"
  | "maxPaymentAmount"
  | "commerceOrderPrefix"
  | "strictAmountValidation"
  | "strictCurrencyValidation"
>;

function pickPayment(settings: StoreSettingsDto): PaymentDraft {
  return {
    version: settings.version,
    flowEnabled: settings.flowEnabled,
    acceptedCurrency: settings.acceptedCurrency,
    refundsEnabled: settings.refundsEnabled,
    minPaymentAmount: settings.minPaymentAmount,
    maxPaymentAmount: settings.maxPaymentAmount,
    commerceOrderPrefix: settings.commerceOrderPrefix,
    strictAmountValidation: settings.strictAmountValidation,
    strictCurrencyValidation: settings.strictCurrencyValidation,
  };
}

export function PaymentSettingsForm({
  settings,
}: {
  settings: StoreSettingsDto;
}) {
  const initial = pickPayment(settings);
  const { draft, setDraft, dirty } = useDraft(initial);
  const { pending, run } = useSettingsAction();
  const [confirmation, setConfirmation] = useState("");

  const needsDisableConfirm = settings.flowEnabled && !draft.flowEnabled;

  return (
    <SettingsFormShell
      pending={pending}
      dirty={dirty}
      onSubmit={() => {
        run(
          () =>
            updatePaymentSettingsAction({
              ...draft,
              confirmation: needsDisableConfirm ? confirmation : undefined,
            }),
          "Ajustes de pagos guardados",
        );
      }}
    >
      <SettingsSectionHeader
        title="Pagos"
        description="Flow.cl, montos, moneda y validaciones de cobro."
      />

      <EnvStatusNote>
        Las credenciales de Flow (FLOW_API_KEY, FLOW_SECRET_KEY) solo se
        configuran en variables de entorno del servidor.
      </EnvStatusNote>

      <div className="flex flex-wrap items-center gap-3">
        <TestConnectionButton kind="flow" />
      </div>

      <SettingsSwitchRow
        label="Flow habilitado"
        checked={draft.flowEnabled}
        onCheckedChange={(value) =>
          setDraft({ ...draft, flowEnabled: value })
        }
      />

      {needsDisableConfirm ? (
        <ConfirmationField
          value={confirmation}
          onChange={setConfirmation}
          expected="DESACTIVAR_FLOW"
          label="Confirmar desactivación de Flow"
        />
      ) : null}

      <SettingsField label="Moneda aceptada" hint="ISO 4217">
        <Input
          className={settingsInputClass}
          value={draft.acceptedCurrency}
          onChange={(event) =>
            setDraft({ ...draft, acceptedCurrency: event.currentTarget.value })
          }
        />
      </SettingsField>

      <SettingsSwitchRow
        label="Reembolsos habilitados"
        checked={draft.refundsEnabled}
        onCheckedChange={(value) =>
          setDraft({ ...draft, refundsEnabled: value })
        }
      />

      <div className="grid max-w-xl gap-3 sm:grid-cols-2">
        <SettingsField label="Monto mínimo de pago">
          <Input
            type="number"
            min={0}
            step="any"
            className={settingsInputClass}
            value={draft.minPaymentAmount ?? ""}
            onChange={(event) => {
              const value = event.currentTarget.value;
              setDraft({
                ...draft,
                minPaymentAmount: value === "" ? null : Number(value),
              });
            }}
          />
        </SettingsField>

        <SettingsField label="Monto máximo de pago">
          <Input
            type="number"
            min={0}
            step="any"
            className={settingsInputClass}
            value={draft.maxPaymentAmount ?? ""}
            onChange={(event) => {
              const value = event.currentTarget.value;
              setDraft({
                ...draft,
                maxPaymentAmount: value === "" ? null : Number(value),
              });
            }}
          />
        </SettingsField>
      </div>

      <SettingsField
        label="Prefijo en asunto de pago"
        hint="El commerceOrder de Flow sigue siendo el ID del pedido (requerido para reconciliación). Este prefijo solo se usa en el asunto del cobro."
      >
        <Input
          className={settingsInputClass}
          value={draft.commerceOrderPrefix}
          onChange={(event) =>
            setDraft({
              ...draft,
              commerceOrderPrefix: event.currentTarget.value,
            })
          }
        />
      </SettingsField>

      <SettingsSwitchRow
        label="Validación estricta de montos"
        checked={draft.strictAmountValidation}
        onCheckedChange={(value) =>
          setDraft({ ...draft, strictAmountValidation: value })
        }
      />

      <SettingsSwitchRow
        label="Validación estricta de moneda"
        checked={draft.strictCurrencyValidation}
        onCheckedChange={(value) =>
          setDraft({ ...draft, strictCurrencyValidation: value })
        }
      />
    </SettingsFormShell>
  );
}
