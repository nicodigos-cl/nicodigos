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
    <div className="flex flex-col gap-8">
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Seguridad
        </h1>
        <p className="text-sm text-muted-foreground">
          Revisa sesiones, verificación de email y acceso a tu cuenta.
        </p>
      </div>
      <SecuritySessions security={security} />
    </div>
  );
}
