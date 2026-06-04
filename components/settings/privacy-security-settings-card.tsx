"use client";

import Link from "next/link";
import {
  IconDeviceDesktop,
  IconDownload,
  IconKey,
  IconLink,
  IconLock,
  IconShield,
} from "@tabler/icons-react";
import { SettingsSectionCard } from "@/components/settings/settings-section-card";
import { SettingsSectionFooter } from "@/components/settings/settings-section-footer";
import type { SettingsSectionControlProps } from "@/components/settings/settings-section-props";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import type { PrivacySecuritySettings } from "@/lib/settings/types";
import { cn } from "@/lib/utils";

type PrivacySecuritySettingsCardProps = SettingsSectionControlProps & {
  value: PrivacySecuritySettings;
  onChange: (value: PrivacySecuritySettings) => void;
};

type SettingsRowProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: React.ReactNode;
  className?: string;
};

function SettingsRow({
  icon,
  title,
  description,
  action,
  className,
}: SettingsRowProps) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-2xl border border-border/30 bg-muted/20 p-4",
        className,
      )}
    >
      <div
        className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-background text-primary ring-1 ring-border/40"
        aria-hidden
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="shrink-0 self-center">{action}</div>
    </div>
  );
}

export function PrivacySecuritySettingsCard({
  value,
  isDirty,
  isSaving,
  message,
  error,
  onSave,
  onCancel,
  onChange,
}: PrivacySecuritySettingsCardProps) {
  return (
    <SettingsSectionCard
      id="privacidad"
      title="Privacidad y seguridad"
      description="Protege tu cuenta, revisa sesiones activas y gestiona el acceso a servicios conectados."
    >
      <SettingsRow
        icon={<IconLock className="size-5" />}
        title="Contraseña"
        description="Actualiza tu contraseña de acceso de forma segura."
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-9 rounded-xl"
            asChild
          >
            <Link href="/auth/forgot-password?callbackUrl=/dashboard/settings">
              Cambiar
            </Link>
          </Button>
        }
      />

      <SettingsRow
        icon={<IconDeviceDesktop className="size-5" />}
        title="Sesiones activas"
        description="Dispositivos con sesión iniciada en los últimos 30 días."
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-9 rounded-xl"
            disabled
          >
            Ver sesiones
          </Button>
        }
      />

      <SettingsRow
        icon={<IconShield className="size-5" />}
        title="Autenticación en dos pasos"
        description="Capa adicional de seguridad al iniciar sesión (próximamente)."
        action={
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Próximamente
            </Badge>
            <Switch
              id="privacy-2fa"
              checked={value.twoFactorEnabled}
              disabled
              aria-label="Autenticación en dos pasos"
            />
          </div>
        }
      />

      <Field orientation="horizontal" className="rounded-2xl px-1 py-2">
        <div className="flex flex-1 flex-col gap-1">
          <FieldLabel htmlFor="privacy-login-alerts" className="font-medium">
            Alertas de inicio de sesión
          </FieldLabel>
          <FieldDescription>
            Recibe un aviso cuando alguien acceda desde un dispositivo nuevo.
          </FieldDescription>
        </div>
        <Switch
          id="privacy-login-alerts"
          checked={value.loginAlerts}
          onCheckedChange={(checked) =>
            onChange({ ...value, loginAlerts: checked })
          }
        />
      </Field>

      <Separator className="bg-border/60" />

      <SettingsRow
        icon={<IconLink className="size-5" />}
        title="Cuentas conectadas"
        description="Google, GitHub u otros proveedores vinculados a tu perfil."
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-9 rounded-xl"
            disabled
          >
            Gestionar
          </Button>
        }
      />

      <SettingsRow
        icon={<IconDownload className="size-5" />}
        title="Exportar mis datos"
        description="Descarga una copia de tu perfil, pedidos y preferencias (GDPR)."
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-9 rounded-xl"
            disabled
          >
            Solicitar
          </Button>
        }
      />

      <div className="flex items-start gap-3 rounded-2xl border border-border/30 bg-muted/10 p-4 text-xs text-muted-foreground">
        <IconKey className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        <p>
          Las keys y datos sensibles nunca se incluyen en
          exportaciones automáticas. Para soporte de seguridad, contacta al
          equipo desde el centro de ayuda.
        </p>
      </div>

      <SettingsSectionFooter
        isDirty={isDirty}
        isSaving={isSaving}
        message={message}
        error={error}
        onSave={onSave}
        onCancel={onCancel}
      />
    </SettingsSectionCard>
  );
}
