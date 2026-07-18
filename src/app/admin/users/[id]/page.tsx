import { notFound, redirect } from "next/navigation";

import { UserDetail } from "@/components/admin/users/user-detail";
import { requireAdminSession } from "@/lib/auth/session";
import { getAdminUserById } from "@/lib/users/queries";
import { parseSearchParamsRecord } from "@/lib/validations/products";
import { userDetailQuerySchema } from "@/lib/validations/users";

export default async function UserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminSession();
  const { id } = await params;
  const parsed = userDetailQuerySchema.safeParse(
    parseSearchParamsRecord(await searchParams),
  );
  if (!parsed.success) redirect(`/admin/users/${id}`);

  const user = await getAdminUserById(id, parsed.data);
  if (!user) notFound();

  return <UserDetail user={user} query={parsed.data} />;
}
