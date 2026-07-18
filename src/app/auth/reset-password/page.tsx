import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "Nueva contraseña",
};

type ResetPasswordPageProps = {
  searchParams: Promise<{
    token?: string;
    error?: string;
  }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const params = await searchParams;
  const hasError = Boolean(params.error) || !params.token;

  return (
    <AuthShell
      title="Elige una nueva contraseña"
      description={
        <>
          ¿Ya la actualizaste?{" "}
          <Link
            href="/auth/login"
            className="font-semibold text-primary hover:text-primary/80"
          >
            Inicia sesión
          </Link>
        </>
      }
    >
      <ResetPasswordForm token={params.token} hasError={hasError} />
    </AuthShell>
  );
}
