import { redirect } from "next/navigation";

import { DashboardView } from "@/components/admin/dashboard/dashboard-view";
import { requireAdminSession } from "@/lib/auth/session";
import { getAdminDashboard } from "@/lib/dashboard/queries";
import { parseSearchParamsRecord } from "@/lib/validations/products";
import { dashboardQuerySchema } from "@/lib/validations/dashboard";

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireAdminSession();
  const parsed = dashboardQuerySchema.safeParse(
    parseSearchParamsRecord(await searchParams),
  );
  if (!parsed.success) redirect("/admin");

  const data = await getAdminDashboard({
    ...parsed.data,
    adminName: session.user.name || session.user.email,
  });

  return <DashboardView data={data} />;
}
