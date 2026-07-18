"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, type FormEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { TurnstileInstance } from "@marsidev/react-turnstile";

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
import { turnstileFetchOptions } from "@/lib/turnstile";
import {
  forgotPasswordFormSchema,
  type ForgotPasswordFormValues,
} from "@/lib/validations/auth";

export function ForgotPasswordForm() {
  const router = useRouter();
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordFormSchema),
    defaultValues: {
      email: "",
    },
  });

  const { isSubmitting } = form.formState;

  const onTokenChange = useCallback((token: string | null) => {
    setCaptchaToken(token);
  }, []);

  async function onValid(values: ForgotPasswordFormValues) {
    setFormError(null);

    if (!captchaToken) {
      setFormError("Completa la verificación de seguridad.");
      return;
    }

    const { error: resetError } =
      await authClient.emailOtp.requestPasswordReset({
        email: values.email,
        fetchOptions: turnstileFetchOptions(captchaToken),
      });

    if (resetError) {
      const message =
        resetError.message ?? "No se pudo enviar el correo de recuperación.";
      setFormError(message);
      toast.error(message);
      turnstileRef.current?.reset();
      setCaptchaToken(null);
      return;
    }

    toast.success("Si el correo existe, te enviamos un código.");
    router.push(
      `/auth/otp?email=${encodeURIComponent(values.email)}&type=forget-password&from=login`,
    );
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    void form.handleSubmit(onValid)(event);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <FieldGroup className="gap-5">
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
          <FieldDescription>
            Te enviaremos un código y un enlace para restablecer tu contraseña.
          </FieldDescription>
          <FieldError>{form.formState.errors.email?.message}</FieldError>
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
        Enviar código
      </Button>
    </form>
  );
}
