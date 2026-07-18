import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { resolveSafeCallbackUrl } from "@/lib/auth/callback-url";

export const metadata: Metadata = {
  title: "Iniciar sesión",
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const callbackURL = resolveSafeCallbackUrl(
    params.callbackUrl ?? params.next,
  );

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
      <LoginForm callbackURL={callbackURL} />
    </AuthShell>
  );
}
