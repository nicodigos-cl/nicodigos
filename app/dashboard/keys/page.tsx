import type { Metadata } from "next";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { UserKeysList } from "@/components/dashboard/user-keys-list";
import { requireUser } from "@/lib/dashboard/auth";
import { getUserKeys } from "@/lib/dashboard/queries";

export const metadata: Metadata = {
  title: "Mis claves",
};

export default async function DashboardKeysPage() {
  const session = await requireUser();
  const keys = await getUserKeys(session.user.id);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 md:space-y-8">
      <DashboardPageHeader
        title="Mis claves"
        description="Claves digitales de tus pedidos"
      />
      <UserKeysList keys={keys} />
    </div>
  );
}
