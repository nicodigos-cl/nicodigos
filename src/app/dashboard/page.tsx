import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Dashboard · Nicodigos",
};

export default async function DashboardPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/login");
  }

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-md text-center">
        <Logo size={64} priority />
        <h1 className="mt-8 text-2xl font-semibold tracking-tight">
          Hola, {session.user.name || "bienvenido"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Revisa tus pedidos y el contenido digital entregado.
        </p>
        <Button
          className="mt-6"
          render={<Link href="/dashboard/orders" />}
          nativeButton={false}
        >
          Ver mis pedidos
        </Button>
      </div>
    </div>
  );
}
