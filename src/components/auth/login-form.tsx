"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { AuthDivider } from "@/components/auth/auth-divider";
import { AuthSocialButtons } from "@/components/auth/auth-social-buttons";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";
import { makeUserAdminByEnv } from "@/lib/auth/admin";

export function LoginForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    const { error: signInError } = await authClient.signIn.email({
      email,
      password,
      rememberMe,
      callbackURL: "/",
    });

    if (signInError) {
      const message =
        signInError.message ?? "No se pudo iniciar sesión. Revisa tus datos.";
      setError(message);
      toast.error(message);

      if (
        message.toLowerCase().includes("verif") ||
        signInError.code === "EMAIL_NOT_VERIFIED"
      ) {
        router.push(
          `/auth/check-email?email=${encodeURIComponent(email)}&type=verify`,
        );
      }
      setPending(false);
      return;
    }

    await makeUserAdminByEnv(email);
    setPending(false);
    toast.success("Sesión iniciada");
    router.push("/");
    router.refresh();
  }

  return (
    <div>
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
          </Field>

          <Field>
            <FieldLabel htmlFor="password">Contraseña</FieldLabel>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="rounded-xl"
            />
          </Field>
        </FieldGroup>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="remember-me"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked)}
            />
            <Label htmlFor="remember-me" className="font-normal">
              Recordarme
            </Label>
          </div>
          <Link
            href="/auth/forgot-password"
            className="text-sm font-semibold text-primary hover:text-primary/80"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        {error ? <FieldError>{error}</FieldError> : null}

        <Button type="submit" className="w-full rounded-xl" disabled={pending}>
          {pending ? <Spinner data-icon="inline-start" /> : null}
          Iniciar sesión
        </Button>
      </form>

      <div className="mt-10 space-y-6">
        <AuthDivider />
        <AuthSocialButtons callbackURL="/" />
      </div>
    </div>
  );
}
