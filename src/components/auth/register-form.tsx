"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { AuthDivider } from "@/components/auth/auth-divider";
import { AuthSocialButtons } from "@/components/auth/auth-social-buttons";
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
import { makeUserAdminByEnv } from "@/lib/auth/admin";

export function RegisterForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
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

    const { error: signUpError } = await authClient.signUp.email({
      name,
      email,
      password,
      callbackURL: "/auth/verify-email?status=success",
    });

    if (signUpError) {
      const message =
        signUpError.message ?? "No se pudo crear la cuenta. Intenta de nuevo.";
      setError(message);
      toast.error(message);
      return;
    }
    await makeUserAdminByEnv(email);
    setPending(false);
    toast.success("Cuenta creada. Revisa tu correo para verificarla.");
    router.push(
      `/auth/check-email?email=${encodeURIComponent(email)}&type=verify`,
    );
  }

  return (
    <div>
      <form onSubmit={onSubmit} className="space-y-6">
        <FieldGroup className="gap-5">
          <Field>
            <FieldLabel htmlFor="name">Nombre</FieldLabel>
            <Input
              id="name"
              name="name"
              type="text"
              required
              autoComplete="name"
              placeholder="Tu nombre"
              className="rounded-xl"
            />
          </Field>

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
          </Field>

          <Field>
            <FieldLabel htmlFor="password">Contraseña</FieldLabel>
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
          Crear cuenta
        </Button>
      </form>

      <div className="mt-10 space-y-6">
        <AuthDivider />
        <AuthSocialButtons callbackURL="/" />
      </div>
    </div>
  );
}
