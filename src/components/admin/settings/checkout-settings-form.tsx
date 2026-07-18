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
import { updateCheckoutSettingsAction } from "@/lib/actions/admin-settings";
import type { StoreSettingsDto } from "@/types/settings";

type CheckoutDraft = Pick<
  StoreSettingsDto,
  | "version"
  | "checkoutEnabled"
  | "requireVerifiedEmail"
  | "requireRut"
  | "requireBillingData"
  | "allowBoleta"
  | "allowFactura"
  | "orderExpirationMinutes"
  | "paymentExpirationMinutes"
  | "requireTermsAcceptance"
  | "termsUrl"
  | "privacyUrl"
  | "maxPaymentAttempts"
  | "reusePendingPaymentIntent"
  | "preventDuplicateOrders"
>;

function pickCheckout(settings: StoreSettingsDto): CheckoutDraft {
  return {
    version: settings.version,
    checkoutEnabled: settings.checkoutEnabled,
    requireVerifiedEmail: settings.requireVerifiedEmail,
    requireRut: settings.requireRut,
    requireBillingData: settings.requireBillingData,
    allowBoleta: settings.allowBoleta,
    allowFactura: settings.allowFactura,
    orderExpirationMinutes: settings.orderExpirationMinutes,
    paymentExpirationMinutes: settings.paymentExpirationMinutes,
    requireTermsAcceptance: settings.requireTermsAcceptance,
    termsUrl: settings.termsUrl,
    privacyUrl: settings.privacyUrl,
    maxPaymentAttempts: settings.maxPaymentAttempts,
    reusePendingPaymentIntent: settings.reusePendingPaymentIntent,
    preventDuplicateOrders: settings.preventDuplicateOrders,
  };
}

export function CheckoutSettingsForm({
  settings,
}: {
  settings: StoreSettingsDto;
}) {
  const initial = pickCheckout(settings);
  const { draft, setDraft, dirty } = useDraft(initial);
  const { pending, run } = useSettingsAction();
  const [confirmation, setConfirmation] = useState("");

  const needsDisableConfirm =
    settings.checkoutEnabled && !draft.checkoutEnabled;

  return (
    <SettingsFormShell
      pending={pending}
      dirty={dirty}
      onSubmit={() => {
        run(
          () =>
            updateCheckoutSettingsAction({
              ...draft,
              confirmation: needsDisableConfirm ? confirmation : undefined,
            }),
          "Ajustes de checkout guardados",
        );
      }}
    >
      <SettingsSectionHeader
        title="Checkout"
        description="Requisitos de compra, términos y expiración de pedidos."
      />

      <EnvStatusNote>
        El checkout como invitado no está soportado. Todos los pedidos requieren
        una cuenta autenticada.
      </EnvStatusNote>

      <SettingsSwitchRow
        label="Checkout habilitado"
        hint="Desactivar impide crear nuevos pedidos."
        checked={draft.checkoutEnabled}
        onCheckedChange={(value) =>
          setDraft({ ...draft, checkoutEnabled: value })
        }
      />

      {needsDisableConfirm ? (
        <ConfirmationField
          value={confirmation}
          onChange={setConfirmation}
          expected="DESACTIVAR_CHECKOUT"
          label="Confirmar desactivación del checkout"
        />
      ) : null}

      <SettingsSwitchRow
        label="Exigir email verificado"
        checked={draft.requireVerifiedEmail}
        onCheckedChange={(value) =>
          setDraft({ ...draft, requireVerifiedEmail: value })
        }
      />

      <SettingsSwitchRow
        label="Exigir RUT"
        checked={draft.requireRut}
        onCheckedChange={(value) => setDraft({ ...draft, requireRut: value })}
      />

      <SettingsSwitchRow
        label="Exigir datos de facturación"
        checked={draft.requireBillingData}
        onCheckedChange={(value) =>
          setDraft({ ...draft, requireBillingData: value })
        }
      />

      <SettingsSwitchRow
        label="Permitir boleta"
        checked={draft.allowBoleta}
        onCheckedChange={(value) =>
          setDraft({ ...draft, allowBoleta: value })
        }
      />

      <SettingsSwitchRow
        label="Permitir factura"
        checked={draft.allowFactura}
        onCheckedChange={(value) =>
          setDraft({ ...draft, allowFactura: value })
        }
      />

      <div className="grid max-w-xl gap-3 sm:grid-cols-2">
        <SettingsField label="Expiración del pedido (minutos)">
          <Input
            type="number"
            min={5}
            className={settingsInputClass}
            value={draft.orderExpirationMinutes}
            onChange={(event) =>
              setDraft({
                ...draft,
                orderExpirationMinutes: Number(event.currentTarget.value),
              })
            }
          />
        </SettingsField>

        <SettingsField label="Expiración del pago (minutos)">
          <Input
            type="number"
            min={5}
            className={settingsInputClass}
            value={draft.paymentExpirationMinutes}
            onChange={(event) =>
              setDraft({
                ...draft,
                paymentExpirationMinutes: Number(event.currentTarget.value),
              })
            }
          />
        </SettingsField>
      </div>

      <SettingsSwitchRow
        label="Exigir aceptación de términos"
        checked={draft.requireTermsAcceptance}
        onCheckedChange={(value) =>
          setDraft({ ...draft, requireTermsAcceptance: value })
        }
      />

      <SettingsField label="URL de términos">
        <Input
          type="url"
          className={settingsInputClass}
          value={draft.termsUrl ?? ""}
          onChange={(event) =>
            setDraft({
              ...draft,
              termsUrl: event.currentTarget.value || null,
            })
          }
        />
      </SettingsField>

      <SettingsField label="URL de privacidad">
        <Input
          type="url"
          className={settingsInputClass}
          value={draft.privacyUrl ?? ""}
          onChange={(event) =>
            setDraft({
              ...draft,
              privacyUrl: event.currentTarget.value || null,
            })
          }
        />
      </SettingsField>

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

      <SettingsSwitchRow
        label="Reutilizar intento de pago pendiente"
        checked={draft.reusePendingPaymentIntent}
        onCheckedChange={(value) =>
          setDraft({ ...draft, reusePendingPaymentIntent: value })
        }
      />

      <SettingsSwitchRow
        label="Prevenir pedidos duplicados"
        checked={draft.preventDuplicateOrders}
        onCheckedChange={(value) =>
          setDraft({ ...draft, preventDuplicateOrders: value })
        }
      />
    </SettingsFormShell>
  );
}
