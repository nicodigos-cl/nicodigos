"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  HiOutlineCheckBadge,
  HiOutlineComputerDesktop,
  HiOutlineDevicePhoneMobile,
  HiOutlineEnvelope,
  HiOutlineExclamationTriangle,
  HiOutlineKey,
  HiOutlineLockClosed,
  HiOutlineShieldCheck,
} from "react-icons/hi2";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  changeCustomerPasswordAction,
  revokeAllOtherSessionsAction,
  revokeOtherSessionAction,
} from "@/lib/actions/customer-dashboard";
import type { CustomerSecurityView } from "@/lib/customer-dashboard/types";
import { formatDateTime } from "@/lib/format-date";
import { cn } from "@/lib/utils";

type PasswordFields = "currentPassword" | "newPassword" | "confirmPassword";
type PasswordErrors = Partial<Record<PasswordFields, string>>;

const providerLabels: Record<string, string> = {
  google: "Google",
  github: "GitHub",
};

function providerLabel(providerId: string) {
  return providerLabels[providerId.toLowerCase()] ?? providerId;
}

function isMobileSession(userAgentSummary: string) {
  return /Android|iOS/i.test(userAgentSummary);
}

export function SecuritySessions({ security }: { security: CustomerSecurityView }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [revokeOnPasswordChange, setRevokeOnPasswordChange] = useState(true);
  const [passwordErrors, setPasswordErrors] = useState<PasswordErrors>({});

  const activeSessions = useMemo(
    () => security.sessions.filter((session) => !session.isExpired),
    [security.sessions],
  );
  const otherActiveSessions = activeSessions.filter((session) => !session.isCurrent);
  const protectionChecks = [
    security.emailVerified,
    security.hasPassword,
    activeSessions.some((session) => session.isCurrent),
  ];
  const protectionScore = protectionChecks.filter(Boolean).length;
  const protectionLabel = protectionScore === 3 ? "Protección al día" : "Revisión recomendada";

  function submitPassword() {
    const localErrors: PasswordErrors = {};
    if (!currentPassword) localErrors.currentPassword = "Ingresa tu contraseña actual";
    if (newPassword.length < 8) localErrors.newPassword = "Usa al menos 8 caracteres";
    if (newPassword === currentPassword && newPassword) {
      localErrors.newPassword = "Debe ser distinta a tu contraseña actual";
    }
    if (confirmPassword !== newPassword) {
      localErrors.confirmPassword = "Las contraseñas no coinciden";
    }
    setPasswordErrors(localErrors);
    if (Object.keys(localErrors).length > 0) return;

    startTransition(() => {
      void (async () => {
        const result = await changeCustomerPasswordAction({
          currentPassword,
          newPassword,
          confirmPassword,
          revokeOtherSessions: revokeOnPasswordChange,
        });
        if (!result.success) {
          setPasswordErrors({
            currentPassword: result.fieldErrors?.currentPassword?.[0],
            newPassword: result.fieldErrors?.newPassword?.[0],
            confirmPassword: result.fieldErrors?.confirmPassword?.[0],
          });
          toast.error(result.message);
          return;
        }
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setPasswordErrors({});
        toast.success(
          revokeOnPasswordChange
            ? "Contraseña actualizada y otras sesiones cerradas"
            : "Contraseña actualizada",
        );
        router.refresh();
      })();
    });
  }

  function revokeSession(sessionId: string) {
    startTransition(() => {
      void (async () => {
        const result = await revokeOtherSessionAction({ sessionId });
        if (!result.success) {
          toast.error(result.message);
          return;
        }
        toast.success("Sesión cerrada");
        router.refresh();
      })();
    });
  }

  function revokeAllSessions() {
    startTransition(() => {
      void (async () => {
        const result = await revokeAllOtherSessionsAction({ confirm: true });
        if (!result.success) {
          toast.error(result.message);
          return;
        }
        toast.success(
          result.data.revoked === 1
            ? "Se cerró 1 sesión"
            : `Se cerraron ${result.data.revoked} sesiones`,
        );
        router.refresh();
      })();
    });
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-primary/15 bg-linear-to-br from-primary/10 via-card to-card p-5 shadow-sm sm:p-7">
        <div className="absolute -top-16 -right-12 size-52 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <HiOutlineShieldCheck className="size-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-heading text-xl font-semibold">{protectionLabel}</h2>
                <Badge variant={protectionScore === 3 ? "default" : "outline"}>
                  {protectionScore} de 3 controles
                </Badge>
              </div>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Tu email, contraseña y sesiones activas forman la primera línea de protección de tu cuenta.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center sm:min-w-72">
            <SecurityCheck label="Email" ready={security.emailVerified} />
            <SecurityCheck label="Clave" ready={security.hasPassword} />
            <SecurityCheck label="Sesión" ready={activeSessions.some((session) => session.isCurrent)} />
          </div>
        </div>
      </section>

      {!security.emailVerified ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/8 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <HiOutlineExclamationTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-medium">Tu email aún no está verificado</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Verificarlo facilita la recuperación segura de tu cuenta.
              </p>
            </div>
          </div>
          <Button size="sm" render={<Link href="/auth/verify-email" />} nativeButton={false}>
            Verificar email
          </Button>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <HiOutlineEnvelope className="size-5 text-primary" />
              Acceso a la cuenta
            </CardTitle>
            <CardDescription>Email y métodos que puedes usar para ingresar.</CardDescription>
            <CardAction>
              <Badge variant={security.emailVerified ? "outline" : "destructive"}>
                {security.emailVerified ? "Verificado" : "Pendiente"}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Email principal</p>
              <p className="mt-1 break-all font-medium">{security.email}</p>
            </div>
            <div className="border-t border-border pt-4">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Métodos conectados</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {security.hasPassword ? (
                  <Badge variant="secondary"><HiOutlineKey />Contraseña</Badge>
                ) : null}
                {security.providers.map((provider) => (
                  <Badge key={provider.id} variant="secondary" className="capitalize">
                    <HiOutlineCheckBadge />{providerLabel(provider.providerId)}
                  </Badge>
                ))}
                {!security.hasPassword && security.providers.length === 0 ? (
                  <span className="text-sm text-muted-foreground">No hay métodos disponibles.</span>
                ) : null}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 border-t border-border pt-4 text-sm">
              <div>
                <p className="text-muted-foreground">Cuenta creada</p>
                <p className="mt-1 font-medium">{formatDateTime(security.accountCreatedAt)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Última actividad</p>
                <p className="mt-1 font-medium">
                  {security.lastActivityAt ? formatDateTime(security.lastActivityAt) : "Sin registro"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <HiOutlineLockClosed className="size-5 text-primary" />
              Contraseña
            </CardTitle>
            <CardDescription>
              {security.hasPassword
                ? "Actualízala sin salir de tu cuenta."
                : "Crea una contraseña mediante recuperación segura."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {security.hasPassword ? (
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  submitPassword();
                }}
              >
                <PasswordInput
                  id="currentPassword"
                  label="Contraseña actual"
                  value={currentPassword}
                  error={passwordErrors.currentPassword}
                  autoComplete="current-password"
                  disabled={pending}
                  onChange={setCurrentPassword}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <PasswordInput
                    id="newPassword"
                    label="Nueva contraseña"
                    value={newPassword}
                    error={passwordErrors.newPassword}
                    autoComplete="new-password"
                    disabled={pending}
                    onChange={setNewPassword}
                  />
                  <PasswordInput
                    id="confirmPassword"
                    label="Confirmar contraseña"
                    value={confirmPassword}
                    error={passwordErrors.confirmPassword}
                    autoComplete="new-password"
                    disabled={pending}
                    onChange={setConfirmPassword}
                  />
                </div>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-muted/50 p-3 text-sm">
                  <Checkbox
                    checked={revokeOnPasswordChange}
                    onCheckedChange={(checked) => setRevokeOnPasswordChange(checked === true)}
                    disabled={pending}
                    aria-label="Cerrar las otras sesiones"
                  />
                  <span>
                    <span className="font-medium">Cerrar las otras sesiones</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      Recomendado si cambias la clave por precaución.
                    </span>
                  </span>
                </label>
                <Button type="submit" disabled={pending}>
                  {pending ? "Actualizando…" : "Actualizar contraseña"}
                </Button>
              </form>
            ) : (
              <div className="flex min-h-52 flex-col items-center justify-center text-center">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-muted">
                  <HiOutlineKey className="size-6 text-muted-foreground" />
                </div>
                <p className="mt-4 font-medium">No tienes una contraseña configurada</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Usa tu email verificado para crear una desde el flujo de recuperación.
                </p>
                <Button className="mt-4" variant="outline" render={<Link href="/auth/forgot-password" />} nativeButton={false}>
                  Crear contraseña
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <HiOutlineComputerDesktop className="size-5 text-primary" />
            Sesiones activas
          </CardTitle>
          <CardDescription>
            {activeSessions.length === 1
              ? "Hay 1 dispositivo con acceso a tu cuenta."
              : `Hay ${activeSessions.length} dispositivos con acceso a tu cuenta.`}
          </CardDescription>
          {otherActiveSessions.length > 0 ? (
            <CardAction>
              <AlertDialog>
                <AlertDialogTrigger render={<Button type="button" size="sm" variant="outline" disabled={pending} />}>
                  Cerrar las demás
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Cerrar las otras sesiones?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Se cerrarán {otherActiveSessions.length} sesiones. Este dispositivo permanecerá conectado.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      disabled={pending}
                      onClick={(event) => {
                        event.preventDefault();
                        revokeAllSessions();
                      }}
                    >
                      Cerrar sesiones
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardAction>
          ) : null}
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {activeSessions.map((session) => {
              const DeviceIcon = isMobileSession(session.userAgentSummary)
                ? HiOutlineDevicePhoneMobile
                : HiOutlineComputerDesktop;
              return (
                <li key={session.id} className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 gap-4">
                    <div className={cn(
                      "flex size-11 shrink-0 items-center justify-center rounded-2xl",
                      session.isCurrent ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                    )}>
                      <DeviceIcon className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{session.userAgentSummary}</p>
                        {session.isCurrent ? <Badge>Este dispositivo</Badge> : null}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {session.ipMasked ?? "IP no disponible"} · Actividad {formatDateTime(session.updatedAt)}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Iniciada {formatDateTime(session.createdAt)} · Expira {formatDateTime(session.expiresAt)}
                      </p>
                    </div>
                  </div>
                  {!session.isCurrent ? (
                    <AlertDialog>
                      <AlertDialogTrigger render={<Button type="button" size="sm" variant="outline" disabled={pending} />}>
                        Cerrar sesión
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Cerrar esta sesión?</AlertDialogTitle>
                          <AlertDialogDescription>
                            El dispositivo “{session.userAgentSummary}” tendrá que volver a iniciar sesión.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            disabled={pending}
                            onClick={(event) => {
                              event.preventDefault();
                              revokeSession(session.id);
                            }}
                          >
                            Cerrar sesión
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {security.sessions.some((session) => session.isExpired) ? (
            <p className="border-t border-border px-6 py-4 text-xs text-muted-foreground">
              Las sesiones expiradas se eliminan automáticamente y ya no permiten acceder a tu cuenta.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        <HiOutlineShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
        <p>
          Por seguridad mostramos direcciones IP parcialmente ocultas y nunca enviamos tokens de sesión al navegador.
          Si no reconoces un dispositivo, cierra esa sesión y cambia tu contraseña.
        </p>
      </div>
    </div>
  );
}

function SecurityCheck({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className={cn("rounded-xl border px-2 py-2.5", ready ? "border-primary/15 bg-primary/8" : "border-border bg-card/70")}>
      <HiOutlineShieldCheck className={cn("mx-auto size-4", ready ? "text-primary" : "text-muted-foreground")} />
      <p className="mt-1 text-xs font-medium">{label}</p>
    </div>
  );
}

function PasswordInput({
  id,
  label,
  value,
  error,
  autoComplete,
  disabled,
  onChange,
}: {
  id: PasswordFields;
  label: string;
  value: string;
  error?: string;
  autoComplete: "current-password" | "new-password";
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="password"
        value={value}
        autoComplete={autoComplete}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? <p id={`${id}-error`} className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
