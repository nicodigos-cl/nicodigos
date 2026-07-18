"use client";

import { useRouter } from "next/navigation";
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

export function ForgotPasswordForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();

    const { error: resetError } = await authClient.requestPasswordReset({
      email,
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    setPending(false);

    if (resetError) {
      const message =
        resetError.message ?? "No se pudo enviar el correo de recuperación.";
      setError(message);
      toast.error(message);
      return;
    }

    toast.success("Si el correo existe, te enviamos instrucciones.");
    router.push(
      `/auth/check-email?email=${encodeURIComponent(email)}&type=reset`,
    );
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
            autoComplete="email"
            placeholder="tu@email.com"
            className="rounded-xl"
          />
          <FieldDescription>
            Te enviaremos un enlace para restablecer tu contraseña.
          </FieldDescription>
        </Field>
      </FieldGroup>

      {error ? <FieldError>{error}</FieldError> : null}

      <Button type="submit" className="w-full rounded-xl" disabled={pending}>
        {pending ? <Spinner data-icon="inline-start" /> : null}
        Enviar enlace
      </Button>
    </form>
  );
}
