import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Recuperar contraseña",
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Recupera tu contraseña"
      description={
        <>
          ¿La recordaste?{" "}
          <Link
            href="/auth/login"
            className="font-semibold text-primary hover:text-primary/80"
          >
            Volver a iniciar sesión
          </Link>
        </>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
