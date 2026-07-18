"use client";

import {
  EnvStatusNote,
  SettingsField,
  SettingsFormShell,
  SettingsSectionHeader,
  settingsInputClass,
  useDraft,
  useSettingsAction,
} from "@/components/admin/settings/settings-form-shared";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateGeneralSettingsAction } from "@/lib/actions/admin-settings";
import type { StoreSettingsDto } from "@/types/settings";

type GeneralDraft = Pick<
  StoreSettingsDto,
  | "version"
  | "storeName"
  | "legalName"
  | "shortDescription"
  | "supportEmail"
  | "senderName"
  | "replyToEmail"
  | "primaryColor"
  | "timezone"
  | "locale"
  | "country"
  | "defaultCurrency"
  | "logoUrl"
  | "faviconUrl"
>;

function pickGeneral(settings: StoreSettingsDto): GeneralDraft {
  return {
    version: settings.version,
    storeName: settings.storeName,
    legalName: settings.legalName,
    shortDescription: settings.shortDescription,
    supportEmail: settings.supportEmail,
    senderName: settings.senderName,
    replyToEmail: settings.replyToEmail,
    primaryColor: settings.primaryColor,
    timezone: settings.timezone,
    locale: settings.locale,
    country: settings.country,
    defaultCurrency: settings.defaultCurrency,
    logoUrl: settings.logoUrl,
    faviconUrl: settings.faviconUrl,
  };
}

export function GeneralSettingsForm({
  settings,
}: {
  settings: StoreSettingsDto;
}) {
  const initial = pickGeneral(settings);
  const { draft, setDraft, dirty } = useDraft(initial);
  const { pending, run } = useSettingsAction();

  return (
    <SettingsFormShell
      pending={pending}
      dirty={dirty}
      onSubmit={() => {
        run(
          () => updateGeneralSettingsAction({ ...draft }),
          "Ajustes generales guardados",
        );
      }}
    >
      <SettingsSectionHeader
        title="General"
        description="Identidad, marca, moneda y localización de la tienda."
      />

      <EnvStatusNote>
        El color de marca aquí es solo referencia visual. El tema CSS del sitio
        se configura por separado y no cambia automáticamente con este valor.
      </EnvStatusNote>

      <SettingsField label="Nombre de la tienda" required>
        <Input
          className={settingsInputClass}
          value={draft.storeName}
          onChange={(event) =>
            setDraft({ ...draft, storeName: event.currentTarget.value })
          }
        />
      </SettingsField>

      <SettingsField label="Razón social">
        <Input
          className={settingsInputClass}
          value={draft.legalName ?? ""}
          onChange={(event) =>
            setDraft({
              ...draft,
              legalName: event.currentTarget.value || null,
            })
          }
        />
      </SettingsField>

      <SettingsField label="Descripción breve">
        <Textarea
          className="min-h-20 max-w-xl rounded-xl"
          value={draft.shortDescription ?? ""}
          onChange={(event) =>
            setDraft({
              ...draft,
              shortDescription: event.currentTarget.value || null,
            })
          }
        />
      </SettingsField>

      <SettingsField label="Email de soporte" required>
        <Input
          type="email"
          className={settingsInputClass}
          value={draft.supportEmail}
          onChange={(event) =>
            setDraft({ ...draft, supportEmail: event.currentTarget.value })
          }
        />
      </SettingsField>

      <SettingsField label="Nombre del remitente" required>
        <Input
          className={settingsInputClass}
          value={draft.senderName}
          onChange={(event) =>
            setDraft({ ...draft, senderName: event.currentTarget.value })
          }
        />
      </SettingsField>

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

      <SettingsField
        label="Color primario"
        hint="Formato hexadecimal (#RRGGBB)"
      >
        <div className="flex max-w-xl items-center gap-3">
          <Input
            className={settingsInputClass}
            value={draft.primaryColor}
            onChange={(event) =>
              setDraft({ ...draft, primaryColor: event.currentTarget.value })
            }
          />
          <span
            className="size-9 shrink-0 rounded-xl border border-border"
            style={{ backgroundColor: draft.primaryColor }}
            aria-hidden
          />
        </div>
      </SettingsField>

      <SettingsField label="Zona horaria">
        <Input
          className={settingsInputClass}
          value={draft.timezone}
          onChange={(event) =>
            setDraft({ ...draft, timezone: event.currentTarget.value })
          }
        />
      </SettingsField>

      <SettingsField label="Locale" hint="Ejemplo: es o es-CL">
        <Input
          className={settingsInputClass}
          value={draft.locale}
          onChange={(event) =>
            setDraft({ ...draft, locale: event.currentTarget.value })
          }
        />
      </SettingsField>

      <SettingsField label="País" hint="Código ISO de 2 letras (CL)">
        <Input
          className={settingsInputClass}
          value={draft.country}
          onChange={(event) =>
            setDraft({ ...draft, country: event.currentTarget.value })
          }
        />
      </SettingsField>

      <SettingsField label="Moneda predeterminada" hint="ISO 4217 (CLP)">
        <Input
          className={settingsInputClass}
          value={draft.defaultCurrency}
          onChange={(event) =>
            setDraft({ ...draft, defaultCurrency: event.currentTarget.value })
          }
        />
      </SettingsField>

      <SettingsField label="URL del logo">
        <Input
          type="url"
          className={settingsInputClass}
          value={draft.logoUrl ?? ""}
          onChange={(event) =>
            setDraft({
              ...draft,
              logoUrl: event.currentTarget.value || null,
            })
          }
        />
      </SettingsField>

      <SettingsField label="URL del favicon">
        <Input
          type="url"
          className={settingsInputClass}
          value={draft.faviconUrl ?? ""}
          onChange={(event) =>
            setDraft({
              ...draft,
              faviconUrl: event.currentTarget.value || null,
            })
          }
        />
      </SettingsField>
    </SettingsFormShell>
  );
}
