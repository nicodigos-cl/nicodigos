"use client";

import {
  EnvStatusNote,
  SettingsFormShell,
  SettingsSectionHeader,
  SettingsSwitchRow,
  useDraft,
  useSettingsAction,
} from "@/components/admin/settings/settings-form-shared";
import { updateSecuritySettingsAction } from "@/lib/actions/admin-settings";
import type { StoreSettingsDto } from "@/types/settings";

type SecurityDraft = Pick<
  StoreSettingsDto,
  | "version"
  | "requireEmailVerifiedForCheckout"
  | "reauthForCredentialReveal"
  | "auditSettingsChanges"
>;

function pickSecurity(settings: StoreSettingsDto): SecurityDraft {
  return {
    version: settings.version,
    requireEmailVerifiedForCheckout: settings.requireEmailVerifiedForCheckout,
    reauthForCredentialReveal: settings.reauthForCredentialReveal,
    auditSettingsChanges: settings.auditSettingsChanges,
  };
}

export function SecuritySettingsForm({
  settings,
  adminCount,
  envAdminCount,
}: {
  settings: StoreSettingsDto;
  adminCount: number;
  envAdminCount: number;
}) {
  const initial = pickSecurity(settings);
  const { draft, setDraft, dirty } = useDraft(initial);
  const { pending, run } = useSettingsAction();

  return (
    <SettingsFormShell
      pending={pending}
      dirty={dirty}
      onSubmit={() => {
        run(
          () => updateSecuritySettingsAction({ ...draft }),
          "Ajustes de seguridad guardados",
        );
      }}
    >
      <SettingsSectionHeader
        title="Seguridad"
        description="Sesiones, administradores y políticas de acceso."
      />

      <EnvStatusNote>
        La duración de sesión usa el valor predeterminado de Better Auth (7
        días). La lista ADMIN_EMAILS en el entorno define el allowlist de
        administradores ({envAdminCount} en entorno, {adminCount} en base de
        datos).
      </EnvStatusNote>

      <SettingsSwitchRow
        label="Exigir email verificado para checkout"
        checked={draft.requireEmailVerifiedForCheckout}
        onCheckedChange={(value) =>
          setDraft({ ...draft, requireEmailVerifiedForCheckout: value })
        }
      />

      <SettingsSwitchRow
        label="Reautenticación para revelar credenciales"
        checked={draft.reauthForCredentialReveal}
        onCheckedChange={(value) =>
          setDraft({ ...draft, reauthForCredentialReveal: value })
        }
      />

      <SettingsSwitchRow
        label="Auditar cambios de ajustes"
        checked={draft.auditSettingsChanges}
        onCheckedChange={(value) =>
          setDraft({ ...draft, auditSettingsChanges: value })
        }
      />
    </SettingsFormShell>
  );
}
