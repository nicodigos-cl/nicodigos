"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";
import { navigateAfterAuth } from "@/lib/auth/callback-url";
import {
  AUTH_HOME_PATH,
  AUTH_OTP_LENGTH,
  authOtpCopy,
  type AuthOtpType,
} from "@/lib/auth/otp";
import { makeUserAdminByEnv } from "@/lib/auth/admin";
import {
  otpFormSchema,
  resetPasswordFormSchema,
  type OtpFormValues,
  type ResetPasswordFormValues,
} from "@/lib/validations/auth";

type AuthOtpFormProps = {
  email: string;
  type: AuthOtpType;
  initialOtp?: string;
  from?: "login" | "register";
  callbackURL?: string;
};

export function AuthOtpForm({
  email,
  type,
  initialOtp = "",
  from,
  callbackURL = AUTH_HOME_PATH,
}: AuthOtpFormProps) {
  const router = useRouter();
  const copy = authOtpCopy(type);
  const [resending, setResending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [resetStep, setResetStep] = useState(
    Boolean(initialOtp) && type === "forget-password",
  );
  const [verifiedOtp, setVerifiedOtp] = useState(
    type === "forget-password" ? initialOtp : "",
  );
  const autoSubmitted = useRef(false);

  const otpForm = useForm<OtpFormValues>({
    resolver: zodResolver(otpFormSchema),
    defaultValues: { otp: initialOtp },
  });

  const resetForm = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const otpValue = useWatch({ control: otpForm.control, name: "otp" }) ?? "";
  const { isSubmitting: otpSubmitting } = otpForm.formState;
  const { isSubmitting: resetSubmitting } = resetForm.formState;

  const backHref =
    from === "login"
      ? "/auth/login"
      : from === "register"
        ? "/auth/register"
        : copy.backHref;
  const backLabel =
    from === "login"
      ? "Volver a iniciar sesión"
      : from === "register"
        ? "Volver a registrarse"
        : copy.backLabel;

  async function verifyOtp(code: string) {
    setFormError(null);

    if (type === "email-verification") {
      const { error: verifyError } = await authClient.emailOtp.verifyEmail({
        email,
        otp: code,
      });

      if (verifyError) {
        const message = verifyError.message ?? "Código inválido o expirado.";
        setFormError(message);
        toast.error(message);
        return;
      }

      void makeUserAdminByEnv(email).catch(() => undefined);
      toast.success("Correo verificado");
      navigateAfterAuth(callbackURL);
      return;
    }

    if (type === "sign-in") {
      const { error: signInError } = await authClient.signIn.emailOtp({
        email,
        otp: code,
      });

      if (signInError) {
        const message = signInError.message ?? "Código inválido o expirado.";
        setFormError(message);
        toast.error(message);
        return;
      }

      void makeUserAdminByEnv(email).catch(() => undefined);
      toast.success("Sesión iniciada");
      navigateAfterAuth(callbackURL);
      return;
    }

    const { error: checkError } = await authClient.emailOtp.checkVerificationOtp(
      {
        email,
        otp: code,
        type: "forget-password",
      },
    );

    if (checkError) {
      const message = checkError.message ?? "Código inválido o expirado.";
      setFormError(message);
      toast.error(message);
      return;
    }

    setVerifiedOtp(code);
    setResetStep(true);
  }

  async function onValidOtp(values: OtpFormValues) {
    await verifyOtp(values.otp);
  }

  async function onValidReset(values: ResetPasswordFormValues) {
    setFormError(null);

    const { error: resetError } = await authClient.emailOtp.resetPassword({
      email,
      otp: verifiedOtp || otpForm.getValues("otp"),
      password: values.password,
    });

    if (resetError) {
      const message =
        resetError.message ?? "No se pudo actualizar la contraseña.";
      setFormError(message);
      toast.error(message);
      return;
    }

    toast.success("Contraseña actualizada");
    router.push("/auth/login");
  }

  function onOtpSubmit(event: FormEvent<HTMLFormElement>) {
    void otpForm.handleSubmit(onValidOtp)(event);
  }

  function onResetSubmit(event: FormEvent<HTMLFormElement>) {
    void resetForm.handleSubmit(onValidReset)(event);
  }

  async function onResend() {
    setResending(true);
    setFormError(null);

    const { error: resendError } = await authClient.emailOtp.sendVerificationOtp(
      {
        email,
        type,
      },
    );

    setResending(false);

    if (resendError) {
      const message = resendError.message ?? "No se pudo reenviar el código.";
      setFormError(message);
      toast.error(message);
      return;
    }

    toast.success("Código reenviado");
  }

  useEffect(() => {
    if (
      !initialOtp ||
      initialOtp.length !== AUTH_OTP_LENGTH ||
      autoSubmitted.current ||
      type === "forget-password"
    ) {
      return;
    }

    autoSubmitted.current = true;
    void otpForm.handleSubmit(onValidOtp)();
    // Auto-submit once when arriving from the email magic link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialOtp, type]);

  if (type === "forget-password" && resetStep) {
    return (
      <form onSubmit={onResetSubmit} className="space-y-6" noValidate>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Nueva contraseña</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              className="rounded-xl"
              aria-invalid={Boolean(resetForm.formState.errors.password)}
              {...resetForm.register("password")}
            />
            <FieldError>{resetForm.formState.errors.password?.message}</FieldError>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              className="rounded-xl"
              aria-invalid={Boolean(
                resetForm.formState.errors.confirmPassword,
              )}
              {...resetForm.register("confirmPassword")}
            />
            <FieldError>
              {resetForm.formState.errors.confirmPassword?.message}
            </FieldError>
          </div>
        </div>

        {formError ? (
          <FieldError className="justify-center">{formError}</FieldError>
        ) : null}

        <div className="flex flex-col gap-2">
          <Button
            type="submit"
            className="w-full rounded-xl"
            disabled={resetSubmitting}
          >
            {resetSubmitting ? <Spinner data-icon="inline-start" /> : null}
            Guardar contraseña
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full rounded-xl"
            onClick={() => {
              setResetStep(false);
              setFormError(null);
              resetForm.reset();
            }}
          >
            Cambiar código
          </Button>
          <Button
            render={<Link href={backHref} />}
            nativeButton={false}
            variant="ghost"
            className="w-full rounded-xl"
          >
            {backLabel}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={onOtpSubmit} className="space-y-6" noValidate>
      <div className="flex justify-center">
        <Controller
          control={otpForm.control}
          name="otp"
          render={({ field }) => (
            <InputOTP
              maxLength={AUTH_OTP_LENGTH}
              value={field.value}
              onChange={field.onChange}
              autoFocus
              containerClassName="gap-2"
            >
              <InputOTPGroup>
                {Array.from({ length: AUTH_OTP_LENGTH }, (_, index) => (
                  <InputOTPSlot key={index} index={index} className="size-10" />
                ))}
              </InputOTPGroup>
            </InputOTP>
          )}
        />
      </div>

      <FieldError className="justify-center">
        {otpForm.formState.errors.otp?.message ?? formError}
      </FieldError>

      <div className="flex flex-col gap-2">
        <Button
          type="submit"
          className="w-full rounded-xl"
          disabled={otpSubmitting || otpValue.length !== AUTH_OTP_LENGTH}
        >
          {otpSubmitting ? <Spinner data-icon="inline-start" /> : null}
          {copy.confirmLabel}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full rounded-xl"
          disabled={resending || otpSubmitting}
          onClick={() => void onResend()}
        >
          {resending ? <Spinner data-icon="inline-start" /> : null}
          Reenviar código
        </Button>
        <Button
          render={<Link href={backHref} />}
          nativeButton={false}
          variant="ghost"
          className="w-full rounded-xl"
        >
          {backLabel}
        </Button>
      </div>
    </form>
  );
}
