"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";

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

type VerifyEmailFormProps = {
  defaultEmail?: string;
};

export function VerifyEmailForm({ defaultEmail = "" }: VerifyEmailFormProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();

    const { error: verifyError } = await authClient.sendVerificationEmail({
      email,
      callbackURL: "/auth/verify-email?status=success",
    });

    setPending(false);

    if (verifyError) {
      const message =
        verifyError.message ?? "No se pudo enviar el correo de verificación.";
      setError(message);
      toast.error(message);
      return;
    }

    setSent(true);
    toast.success("Correo de verificación enviado");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <FieldGroup className="gap-5">
        <Field>
          <FieldLabel htmlFor="email">Correo electrónico</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            required
            defaultValue={defaultEmail}
            autoComplete="email"
            placeholder="tu@email.com"
            className="rounded-xl"
          />
          <FieldDescription>
            Te reenviaremos el enlace de verificación.
          </FieldDescription>
        </Field>
      </FieldGroup>

      {error ? <FieldError>{error}</FieldError> : null}
      {sent ? (
        <p className="text-sm text-muted-foreground">
          Listo. Revisa tu bandeja de entrada y la carpeta de spam.
        </p>
      ) : null}

      <Button type="submit" className="w-full rounded-xl" disabled={pending}>
        {pending ? <Spinner data-icon="inline-start" /> : null}
        Reenviar verificación
      </Button>
    </form>
  );
}
