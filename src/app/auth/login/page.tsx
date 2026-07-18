import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Iniciar sesión",
};

export default function LoginPage() {
  return (
    <AuthShell
      title="Inicia sesión en tu cuenta"
      description={
        <>
          ¿No tienes cuenta?{" "}
          <Link
            href="/auth/register"
            className="font-semibold text-primary hover:text-primary/80"
          >
            Crea una gratis
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthShell>
  );
}
