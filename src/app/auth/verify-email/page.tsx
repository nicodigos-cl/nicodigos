import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthOtpShell } from "@/components/auth/auth-otp-shell";
import { Button } from "@/components/ui/button";
import { resolveSafeCallbackUrl } from "@/lib/auth/callback-url";
import { AUTH_HOME_PATH, buildAuthOtpPath } from "@/lib/auth/otp";

export const metadata: Metadata = {
  title: "Verificar correo",
};

type VerifyEmailPageProps = {
  searchParams: Promise<{
    status?: string;
    email?: string;
    callbackUrl?: string;
  }>;
};

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const params = await searchParams;
  const callbackURL = resolveSafeCallbackUrl(params.callbackUrl);

  if (params.status === "success") {
    return (
      <AuthOtpShell
        title="Correo verificado"
        description="Tu cuenta ya está lista."
      >
        <Button
          render={<Link href={callbackURL} />}
          nativeButton={false}
          className="w-full rounded-xl"
        >
          Continuar
        </Button>
      </AuthOtpShell>
    );
  }

  const email = params.email?.trim().toLowerCase() ?? "";
  if (!email) {
    redirect("/auth/login");
  }

  redirect(
    buildAuthOtpPath({
      email,
      type: "email-verification",
      from: "login",
      callbackUrl: callbackURL !== AUTH_HOME_PATH ? callbackURL : undefined,
    }),
  );
}
