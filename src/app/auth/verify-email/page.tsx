import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { VerifyEmailForm } from "@/components/auth/verify-email-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

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
  const isSuccess = params.status === "success";

  if (isSuccess) {
    return (
      <AuthShell
        title="Correo verificado"
        description="Tu cuenta ya está lista. Bienvenido a Nicodigos."
      >
        <div className="space-y-6">
          <Alert>
            <AlertTitle>Listo</AlertTitle>
            <AlertDescription>
              Ya puedes comprar productos digitales y acceder a tus entregas.
            </AlertDescription>
          </Alert>
          <Button
            render={<Link href="/" />}
            nativeButton={false}
            className="w-full rounded-xl"
          >
            Ir a la tienda
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Verifica tu correo"
      description={
        <>
          ¿Ya lo verificaste?{" "}
          <Link
            href="/auth/login"
            className="font-semibold text-primary hover:text-primary/80"
          >
            Inicia sesión
          </Link>
        </>
      }
    >
      <VerifyEmailForm defaultEmail={params.email} />
    </AuthShell>
  );
}
