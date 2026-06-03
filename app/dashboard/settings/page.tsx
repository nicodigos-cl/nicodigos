import type { Metadata } from "next";
import { SettingsPage } from "@/components/settings/settings-page";
import { requireUser } from "@/lib/dashboard/auth";
import { isR2Configured } from "@/lib/r2/env";
import { getUserSettings } from "@/lib/settings/queries";

export const metadata: Metadata = {
  title: "Configuración",
};

export default async function DashboardSettingsPage() {
  const session = await requireUser();
  const initialData = await getUserSettings(session.user.id);

  return (
    <SettingsPage
      initialData={initialData}
      r2Configured={isR2Configured()}
    />
  );
}
