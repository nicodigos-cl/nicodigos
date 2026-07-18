"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";

type ResetPasswordFormProps = {
  token?: string;
  hasError?: boolean;
};

export function ResetPasswordForm({ token, hasError }: ResetPasswordFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (hasError || !token) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertTitle>Enlace inválido o expirado</AlertTitle>
          <AlertDescription>
            Solicita un nuevo enlace para restablecer tu contraseña.
          </AlertDescription>
        </Alert>
        <Button
          render={<Link href="/auth/forgot-password" />}
          nativeButton={false}
          className="w-full rounded-xl"
        >
          Solicitar nuevo enlace
        </Button>
      </div>
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (password !== confirmPassword) {
      setPending(false);
      setError("Las contraseñas no coinciden");
      return;
    }

    if (password.length < 8) {
      setPending(false);
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    const { error: resetError } = await authClient.resetPassword({
      newPassword: password,
      token: token!,
    });

    setPending(false);

    if (resetError) {
      const message =
        resetError.message ?? "No se pudo actualizar la contraseña.";
      setError(message);
      toast.error(message);
      return;
    }

    toast.success("Contraseña actualizada. Ya puedes iniciar sesión.");
    router.push("/auth/login");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <FieldGroup className="gap-5">
        <Field>
          <FieldLabel htmlFor="password">Nueva contraseña</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            minLength={8}
            className="rounded-xl"
          />
          <FieldDescription>Mínimo 8 caracteres.</FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="confirmPassword">
            Confirmar contraseña
          </FieldLabel>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            autoComplete="new-password"
            minLength={8}
            className="rounded-xl"
          />
        </Field>
      </FieldGroup>

      {error ? <FieldError>{error}</FieldError> : null}

      <Button type="submit" className="w-full rounded-xl" disabled={pending}>
        {pending ? <Spinner data-icon="inline-start" /> : null}
        Guardar contraseña
      </Button>
    </form>
  );
}
