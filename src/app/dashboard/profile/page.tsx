import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ProfileHeader } from "@/components/dashboard/profile-header";
import { ProfileCompletenessCard } from "@/components/dashboard/profile-completeness-card";
import { PersonalInfoForm } from "@/components/dashboard/personal-info-form";
import { BillingInfoForm } from "@/components/dashboard/billing-info-form";
import { getSession } from "@/lib/auth/session";
import { getCustomerProfile } from "@/lib/customer-dashboard/queries";
import { CUSTOMER_PROFILE_PATH } from "@/lib/customer-dashboard/paths";

export const metadata: Metadata = {
  title: "Perfil",
};

export default async function CustomerProfilePage() {
  const session = await getSession();
  if (!session?.user) {
    redirect(`/auth/login?callbackUrl=${encodeURIComponent(CUSTOMER_PROFILE_PATH)}`);
  }

  const profile = await getCustomerProfile(session.user.id);

  return (
    <div className="flex flex-col gap-6">
      <ProfileHeader />

      <ProfileCompletenessCard profile={profile} />

      <div className="space-y-6">
        <PersonalInfoForm
          initialName={profile.name}
          initialPhone={profile.phone}
          email={profile.email}
        />

        <BillingInfoForm profile={profile} />
      </div>
    </div>
  );
}
