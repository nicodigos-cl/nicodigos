import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthOtpShell } from "@/components/auth/auth-otp-shell";
import { Button } from "@/components/ui/button";
import { AUTH_HOME_PATH, buildAuthOtpPath } from "@/lib/auth/otp";

export const metadata: Metadata = {
  title: "Verificar correo",
};

type VerifyEmailPageProps = {
  searchParams: Promise<{
    status?: string;
    email?: string;
  }>;
};

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const params = await searchParams;

  if (params.status === "success") {
    return (
      <AuthOtpShell
        title="Correo verificado"
        description="Tu cuenta ya está lista."
      >
        <Button
          render={<Link href={AUTH_HOME_PATH} />}
          nativeButton={false}
          className="w-full rounded-xl"
        >
          Ir al dashboard
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
    }),
  );
}
