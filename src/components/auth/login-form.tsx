"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, type FormEvent } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { TurnstileInstance } from "@marsidev/react-turnstile";

import { AuthDivider } from "@/components/auth/auth-divider";
import { AuthSocialButtons } from "@/components/auth/auth-social-buttons";
import { AuthTurnstile } from "@/components/auth/auth-turnstile";
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
import { AUTH_HOME_PATH } from "@/lib/auth/otp";
import { turnstileFetchOptions } from "@/lib/turnstile";
import {
  loginFormSchema,
  type LoginFormValues,
} from "@/lib/validations/auth";

export function LoginForm() {
  const router = useRouter();
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: true,
    },
  });

  const { isSubmitting } = form.formState;

  const onTokenChange = useCallback((token: string | null) => {
    setCaptchaToken(token);
  }, []);

  async function onEmailOtpSignIn() {
    setFormError(null);

    const emailValid = await form.trigger("email");
    if (!emailValid) return;

    const email = form.getValues("email");
    form.clearErrors();

    const { error: otpError } = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: "sign-in",
    });

    if (otpError) {
      const message = otpError.message ?? "No se pudo enviar el código.";
      setFormError(message);
      toast.error(message);
      return;
    }

    toast.success("Revisa tu correo");
    router.push(
      `/auth/otp?email=${encodeURIComponent(email)}&type=sign-in&from=login`,
    );
  }

  async function onValid(values: LoginFormValues) {
    setFormError(null);

    if (!captchaToken) {
      setFormError("Completa la verificación de seguridad.");
      return;
    }

    const { error: signInError } = await authClient.signIn.email({
      email: values.email,
      password: values.password,
      rememberMe: values.rememberMe,
      callbackURL: AUTH_HOME_PATH,
      fetchOptions: turnstileFetchOptions(captchaToken),
    });

    if (signInError) {
      const message =
        signInError.message ?? "No se pudo iniciar sesión. Revisa tus datos.";
      setFormError(message);
      toast.error(message);
      turnstileRef.current?.reset();
      setCaptchaToken(null);

      if (
        message.toLowerCase().includes("verif") ||
        signInError.code === "EMAIL_NOT_VERIFIED"
      ) {
        void authClient.emailOtp.sendVerificationOtp({
          email: values.email,
          type: "email-verification",
        });
        router.push(
          `/auth/otp?email=${encodeURIComponent(values.email)}&type=email-verification&from=login`,
        );
      }
      return;
    }

    await makeUserAdminByEnv(values.email);
    toast.success("Sesión iniciada");
    router.push(AUTH_HOME_PATH);
    router.refresh();
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    void form.handleSubmit(onValid)(event);
  }

  return (
    <div>
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
            <FieldError>{form.formState.errors.email?.message}</FieldError>
          </Field>

          <Field data-invalid={Boolean(form.formState.errors.password)}>
            <FieldLabel htmlFor="password">Contraseña</FieldLabel>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              className="rounded-xl"
              aria-invalid={Boolean(form.formState.errors.password)}
              {...form.register("password")}
            />
            <FieldError>{form.formState.errors.password?.message}</FieldError>
          </Field>
        </FieldGroup>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Controller
              control={form.control}
              name="rememberMe"
              render={({ field }) => (
                <Checkbox
                  id="remember-me"
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked)}
                />
              )}
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

        <AuthTurnstile ref={turnstileRef} onTokenChange={onTokenChange} />

        {formError ? <FieldError>{formError}</FieldError> : null}

        <Button
          type="submit"
          className="w-full rounded-xl"
          disabled={isSubmitting || !captchaToken}
        >
          {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
          Iniciar sesión
        </Button>

        <Button
          type="button"
          variant="ghost"
          className="w-full rounded-xl"
          disabled={isSubmitting}
          onClick={() => void onEmailOtpSignIn()}
        >
          Entrar con código
        </Button>
      </form>

      <div className="mt-10 space-y-6">
        <AuthDivider />
        <AuthSocialButtons callbackURL={AUTH_HOME_PATH} />
      </div>
    </div>
  );
}
