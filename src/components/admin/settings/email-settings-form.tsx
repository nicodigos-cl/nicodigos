"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  sendTestEmailAction,
  updateEmailSettingsAction,
} from "@/lib/actions/admin-settings";
import type { StoreSettingsDto } from "@/types/settings";

type EmailDraft = Pick<
  StoreSettingsDto,
  | "version"
  | "resendEnabled"
  | "replyToEmail"
  | "transactionalEmailsEnabled"
  | "adminEmailsEnabled"
  | "emailOrderCreated"
  | "emailPaymentApproved"
  | "emailPaymentRejected"
  | "emailDeliveryAvailable"
  | "emailDeliveryFailed"
  | "emailPasswordReset"
  | "emailEmailVerification"
>;

type TestTemplate =
  | "auth-otp"
  | "delivery-completed"
  | "delivery-failed"
  | "delivery-processing"
  | "order-lifecycle";

const TEMPLATE_LABELS: Record<TestTemplate, string> = {
  "auth-otp": "OTP de autenticación",
  "delivery-completed": "Entrega completada",
  "delivery-failed": "Entrega fallida",
  "delivery-processing": "Entrega en proceso",
  "order-lifecycle": "Pedido creado",
};

function pickEmail(settings: StoreSettingsDto): EmailDraft {
  return {
    version: settings.version,
    resendEnabled: settings.resendEnabled,
    replyToEmail: settings.replyToEmail,
    transactionalEmailsEnabled: settings.transactionalEmailsEnabled,
    adminEmailsEnabled: settings.adminEmailsEnabled,
    emailOrderCreated: settings.emailOrderCreated,
    emailPaymentApproved: settings.emailPaymentApproved,
    emailPaymentRejected: settings.emailPaymentRejected,
    emailDeliveryAvailable: settings.emailDeliveryAvailable,
    emailDeliveryFailed: settings.emailDeliveryFailed,
    emailPasswordReset: settings.emailPasswordReset,
    emailEmailVerification: settings.emailEmailVerification,
  };
}

export function EmailSettingsForm({
  settings,
}: {
  settings: StoreSettingsDto;
}) {
  const initial = pickEmail(settings);
  const { draft, setDraft, dirty } = useDraft(initial);
  const { pending, run } = useSettingsAction();
  const [confirmation, setConfirmation] = useState("");
  const router = useRouter();
  const [testPending, startTestTransition] = useTransition();
  const [testTo, setTestTo] = useState("");
  const [testTemplate, setTestTemplate] =
    useState<TestTemplate>("order-lifecycle");

  const disablingCritical =
    (settings.emailPasswordReset && !draft.emailPasswordReset) ||
    (settings.emailEmailVerification && !draft.emailEmailVerification);

  return (
    <div className="space-y-8">
      <SettingsFormShell
        pending={pending}
        dirty={dirty}
        onSubmit={() => {
          run(
            () =>
              updateEmailSettingsAction({
                ...draft,
                confirmation: disablingCritical ? confirmation : undefined,
              }),
            "Ajustes de correo guardados",
          );
        }}
      >
        <SettingsSectionHeader
          title="Correos"
          description="Resend, remitente y emails transaccionales."
        />

        <EnvStatusNote>
          RESEND_API_KEY y RESEND_FROM se configuran en variables de entorno. El
          remitente visible depende de la verificación del dominio en Resend.
        </EnvStatusNote>

        <div className="flex flex-wrap items-center gap-3">
          <TestConnectionButton kind="resend" />
        </div>

        <SettingsSwitchRow
          label="Resend habilitado"
          checked={draft.resendEnabled}
          onCheckedChange={(value) =>
            setDraft({ ...draft, resendEnabled: value })
          }
        />

        <SettingsField label="Reply-to">
          <Input
            type="email"
            className={settingsInputClass}
            value={draft.replyToEmail ?? ""}
            onChange={(event) =>
              setDraft({
                ...draft,
                replyToEmail: event.currentTarget.value || null,
              })
            }
          />
        </SettingsField>

        <SettingsSwitchRow
          label="Emails transaccionales"
          checked={draft.transactionalEmailsEnabled}
          onCheckedChange={(value) =>
            setDraft({ ...draft, transactionalEmailsEnabled: value })
          }
        />

        <SettingsSwitchRow
          label="Emails administrativos"
          checked={draft.adminEmailsEnabled}
          onCheckedChange={(value) =>
            setDraft({ ...draft, adminEmailsEnabled: value })
          }
        />

        <SettingsSwitchRow
          label="Email: pedido creado"
          checked={draft.emailOrderCreated}
          onCheckedChange={(value) =>
            setDraft({ ...draft, emailOrderCreated: value })
          }
        />

        <SettingsSwitchRow
          label="Email: pago aprobado"
          checked={draft.emailPaymentApproved}
          onCheckedChange={(value) =>
            setDraft({ ...draft, emailPaymentApproved: value })
          }
        />

        <SettingsSwitchRow
          label="Email: pago rechazado"
          checked={draft.emailPaymentRejected}
          onCheckedChange={(value) =>
            setDraft({ ...draft, emailPaymentRejected: value })
          }
        />

        <SettingsSwitchRow
          label="Email: entrega disponible"
          checked={draft.emailDeliveryAvailable}
          onCheckedChange={(value) =>
            setDraft({ ...draft, emailDeliveryAvailable: value })
          }
        />

        <SettingsSwitchRow
          label="Email: entrega fallida"
          checked={draft.emailDeliveryFailed}
          onCheckedChange={(value) =>
            setDraft({ ...draft, emailDeliveryFailed: value })
          }
        />

        <SettingsSwitchRow
          label="Email: restablecer contraseña"
          checked={draft.emailPasswordReset}
          onCheckedChange={(value) =>
            setDraft({ ...draft, emailPasswordReset: value })
          }
        />

        <SettingsSwitchRow
          label="Email: verificación de email"
          checked={draft.emailEmailVerification}
          onCheckedChange={(value) =>
            setDraft({ ...draft, emailEmailVerification: value })
          }
        />

        {disablingCritical ? (
          <ConfirmationField
            value={confirmation}
            onChange={setConfirmation}
            expected="DESACTIVAR_EMAILS_CRITICOS"
            label="Confirmar desactivación de emails críticos"
          />
        ) : null}
      </SettingsFormShell>

      <form
        className="space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-5"
        onSubmit={(event) => {
          event.preventDefault();
          startTestTransition(() => {
            void (async () => {
              const result = await sendTestEmailAction({
                to: testTo,
                template: testTemplate,
              });
              if (!result.success) {
                toast.error(result.message);
                return;
              }
              toast.success(`Email de prueba enviado a ${result.data.to}`);
              router.refresh();
            })();
          });
        }}
      >
        <h3 className="text-sm font-medium">Enviar email de prueba</h3>
        <p className="text-xs text-muted-foreground">
          Usa datos ficticios. No corresponde a pedidos reales.
        </p>

        <SettingsField label="Destinatario" required>
          <Input
            type="email"
            className={settingsInputClass}
            value={testTo}
            onChange={(event) => setTestTo(event.currentTarget.value)}
            required
            disabled={testPending}
          />
        </SettingsField>

        <SettingsField label="Plantilla">
          <select
            className={settingsInputClass}
            value={testTemplate}
            onChange={(event) =>
              setTestTemplate(event.currentTarget.value as TestTemplate)
            }
            disabled={testPending}
          >
            {(Object.keys(TEMPLATE_LABELS) as TestTemplate[]).map((key) => (
              <option key={key} value={key}>
                {TEMPLATE_LABELS[key]}
              </option>
            ))}
          </select>
        </SettingsField>

        <Button type="submit" size="sm" disabled={testPending || !testTo}>
          {testPending ? "Enviando…" : "Enviar prueba"}
        </Button>
      </form>
    </div>
  );
}
