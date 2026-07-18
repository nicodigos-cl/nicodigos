import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Revisa tu correo",
};

type CheckEmailPageProps = {
  searchParams: Promise<{
    email?: string;
    type?: string;
  }>;
};

export default async function CheckEmailPage({
  searchParams,
}: CheckEmailPageProps) {
  const params = await searchParams;
  const email = params.email;
  const isReset = params.type === "reset";

  return (
    <AuthShell
      title="Revisa tu bandeja de entrada"
      description={
        email ? (
          <>
            Enviamos un correo a{" "}
            <span className="font-medium text-foreground">{email}</span>
          </>
        ) : (
          "Te enviamos un correo con los siguientes pasos."
        )
      }
    >
      <div className="space-y-6">
        <Alert>
          <AlertTitle>
            {isReset
              ? "Enlace de recuperación enviado"
              : "Verificación enviada"}
          </AlertTitle>
          <AlertDescription>
            {isReset
              ? "Abre el correo y elige una nueva contraseña. El enlace expira por seguridad."
              : "Abre el correo y confirma tu cuenta para empezar a comprar productos digitales."}
          </AlertDescription>
        </Alert>

        <div className="flex flex-col gap-3">
          {!isReset ? (
            <Button
              render={
                <Link
                  href={`/auth/verify-email${email ? `?email=${encodeURIComponent(email)}` : ""}`}
                />
              }
              nativeButton={false}
              variant="outline"
              className="w-full rounded-xl"
            >
              Reenviar verificación
            </Button>
          ) : null}
          <Button
            render={<Link href="/auth/login" />}
            nativeButton={false}
            className="w-full rounded-xl"
          >
            Volver a iniciar sesión
          </Button>
        </div>
      </div>
    </AuthShell>
  );
}
