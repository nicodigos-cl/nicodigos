import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ProfileForms } from "@/components/dashboard/profile-forms";
import { getSession } from "@/lib/auth/session";
import { getCustomerProfile } from "@/lib/customer-dashboard/queries";

export const metadata: Metadata = {
  title: "Perfil",
};

export default async function CustomerProfilePage() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/dashboard/profile");
  }

  const profile = await getCustomerProfile(session.user.id);

  return (
    <div className="flex flex-col gap-8">
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Perfil
        </h1>
        <p className="text-sm text-muted-foreground">
          Administra tus datos personales y de facturación.
        </p>
      </div>
      <ProfileForms profile={profile} />
    </div>
  );
}
