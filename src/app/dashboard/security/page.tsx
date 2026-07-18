import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SecuritySessions } from "@/components/dashboard/security-sessions";
import { getSession } from "@/lib/auth/session";
import { getCustomerSecurityView } from "@/lib/customer-dashboard/queries";

export const metadata: Metadata = {
  title: "Seguridad",
};

export default async function CustomerSecurityPage() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/dashboard/security");
  }

  const security = await getCustomerSecurityView(
    session.user.id,
    session.session.token,
  );

  return (
    <div className="mx-auto flex w-full flex-col gap-7">
      <div className="space-y-1">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Seguridad
        </h1>
        <p className="text-sm text-muted-foreground">
          Protege tu cuenta, actualiza tu contraseña y controla dónde tienes sesiones abiertas.
        </p>
      </div>
      <SecuritySessions security={security} />
    </div>
  );
}
