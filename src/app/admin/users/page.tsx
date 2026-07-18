import Link from "next/link";
import { redirect } from "next/navigation";
import { HiOutlineUsers } from "react-icons/hi";

import { UserMetrics } from "@/components/admin/users/user-metrics";
import { UsersMobileList } from "@/components/admin/users/users-mobile-list";
import { UsersPagination } from "@/components/admin/users/users-pagination";
import { UsersTable } from "@/components/admin/users/users-table";
import { UsersToolbar } from "@/components/admin/users/users-toolbar";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { requireAdminSession } from "@/lib/auth/session";
import { getAdminUsers, getUserMetrics } from "@/lib/users/queries";
import { usersHref } from "@/lib/users/url";
import { parseSearchParamsRecord } from "@/lib/validations/products";
import { usersListQuerySchema } from "@/lib/validations/users";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminSession();
  const parsed = usersListQuerySchema.safeParse(
    parseSearchParamsRecord(await searchParams),
  );
  if (!parsed.success) redirect("/admin/users");

  const query = parsed.data;
  const [result, metrics] = await Promise.all([
    getAdminUsers(query),
    getUserMetrics(query),
  ]);

  if (result.total > 0 && query.page > result.totalPages) {
    redirect(usersHref(query, { page: result.totalPages }));
  }

  const hasFilters = Object.entries(query).some(
    ([key, value]) =>
      !["page", "pageSize", "sort", "order"].includes(key) &&
      value !== undefined,
  );

  return (
    <div className="flex flex-col gap-6">
      <UsersToolbar query={query} />
      <UserMetrics metrics={metrics} />
      {result.total === 0 ? (
        <Empty className="border border-border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HiOutlineUsers className="size-5" />
            </EmptyMedia>
            <EmptyTitle>
              {hasFilters ? "Sin resultados" : "Sin usuarios todavía"}
            </EmptyTitle>
            <EmptyDescription>
              {hasFilters
                ? "No hay usuarios que coincidan con los filtros actuales."
                : "Los usuarios aparecerán cuando se registren en Nicodigos."}
            </EmptyDescription>
          </EmptyHeader>
          {hasFilters ? (
            <EmptyContent>
              <Button
                render={<Link href="/admin/users" />}
                nativeButton={false}
              >
                Limpiar filtros
              </Button>
            </EmptyContent>
          ) : null}
        </Empty>
      ) : (
        <>
          <div className="hidden md:block">
            <UsersTable data={result.items} />
          </div>
          <div className="md:hidden">
            <UsersMobileList data={result.items} />
          </div>
          <UsersPagination
            page={result.page}
            pageSize={result.pageSize}
            total={result.total}
            totalPages={result.totalPages}
            query={query}
          />
        </>
      )}
    </div>
  );
}
