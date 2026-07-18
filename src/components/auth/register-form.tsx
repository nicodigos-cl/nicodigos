"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, type FormEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { TurnstileInstance } from "@marsidev/react-turnstile";

import { AuthDivider } from "@/components/auth/auth-divider";
import { AuthSocialButtons } from "@/components/auth/auth-social-buttons";
import { AuthTurnstile } from "@/components/auth/auth-turnstile";
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
import { AUTH_HOME_PATH } from "@/lib/auth/otp";
import { turnstileFetchOptions } from "@/lib/turnstile";
import {
  registerFormSchema,
  type RegisterFormValues,
} from "@/lib/validations/auth";

export function RegisterForm() {
  const router = useRouter();
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const { isSubmitting } = form.formState;

  const onTokenChange = useCallback((token: string | null) => {
    setCaptchaToken(token);
  }, []);

  async function onValid(values: RegisterFormValues) {
    setFormError(null);

    if (!captchaToken) {
      setFormError("Completa la verificación de seguridad.");
      return;
    }

    const { error: signUpError } = await authClient.signUp.email({
      name: values.name,
      email: values.email,
      password: values.password,
      callbackURL: AUTH_HOME_PATH,
      fetchOptions: turnstileFetchOptions(captchaToken),
    });

    if (signUpError) {
      const message =
        signUpError.message ?? "No se pudo crear la cuenta. Intenta de nuevo.";
      setFormError(message);
      toast.error(message);
      turnstileRef.current?.reset();
      setCaptchaToken(null);
      return;
    }

    await makeUserAdminByEnv(values.email);
    toast.success("Cuenta creada. Revisa tu correo.");
    router.push(
      `/auth/otp?email=${encodeURIComponent(values.email)}&type=email-verification&from=register`,
    );
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    void form.handleSubmit(onValid)(event);
  }

  return (
    <div>
      <form onSubmit={onSubmit} className="space-y-6" noValidate>
        <FieldGroup className="gap-5">
          <Field data-invalid={Boolean(form.formState.errors.name)}>
            <FieldLabel htmlFor="name">Nombre</FieldLabel>
            <Input
              id="name"
              type="text"
              autoComplete="name"
              placeholder="Tu nombre"
              className="rounded-xl"
              aria-invalid={Boolean(form.formState.errors.name)}
              {...form.register("name")}
            />
            <FieldError>{form.formState.errors.name?.message}</FieldError>
          </Field>

          <Field data-invalid={Boolean(form.formState.errors.email)}>
            <FieldLabel htmlFor="email">Correo electrónico</FieldLabel>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="tu@email.com"
              className="rounded-xl"
              aria-invalid={Boolean(form.formState.errors.email)}
              {...form.register("email")}
            />
            <FieldError>{form.formState.errors.email?.message}</FieldError>
          </Field>

          <Field data-invalid={Boolean(form.formState.errors.password)}>
            <FieldLabel htmlFor="password">Contraseña</FieldLabel>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              className="rounded-xl"
              aria-invalid={Boolean(form.formState.errors.password)}
              {...form.register("password")}
            />
            <FieldDescription>Mínimo 8 caracteres.</FieldDescription>
            <FieldError>{form.formState.errors.password?.message}</FieldError>
          </Field>

          <Field data-invalid={Boolean(form.formState.errors.confirmPassword)}>
            <FieldLabel htmlFor="confirmPassword">
              Confirmar contraseña
            </FieldLabel>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              className="rounded-xl"
              aria-invalid={Boolean(form.formState.errors.confirmPassword)}
              {...form.register("confirmPassword")}
            />
            <FieldError>
              {form.formState.errors.confirmPassword?.message}
            </FieldError>
          </Field>
        </FieldGroup>

        <AuthTurnstile ref={turnstileRef} onTokenChange={onTokenChange} />

        {formError ? <FieldError>{formError}</FieldError> : null}

        <Button
          type="submit"
          className="w-full rounded-xl"
          disabled={isSubmitting || !captchaToken}
        >
          {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
          Crear cuenta
        </Button>
      </form>

      <div className="mt-10 space-y-6">
        <AuthDivider />
        <AuthSocialButtons callbackURL={AUTH_HOME_PATH} />
      </div>
    </div>
  );
}
