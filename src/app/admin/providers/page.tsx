import { redirect } from "next/navigation";
import Link from "next/link";
import { HiOutlineServer } from "react-icons/hi";

import { ProvidersMobileList } from "@/components/admin/smm-providers/providers-mobile-list";
import { ProvidersPagination } from "@/components/admin/smm-providers/providers-pagination";
import { ProvidersTable } from "@/components/admin/smm-providers/providers-table";
import { ProvidersToolbar } from "@/components/admin/smm-providers/providers-toolbar";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { getSmmProvidersPage } from "@/lib/smm-providers/queries";
import { parseSearchParamsRecord } from "@/lib/validations/products";
import { providersListQuerySchema } from "@/lib/validations/smm-providers";

type ProvidersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ProvidersPage({
  searchParams,
}: ProvidersPageProps) {
  const rawParams = parseSearchParamsRecord(await searchParams);
  const parsed = providersListQuerySchema.safeParse(rawParams);

  if (!parsed.success) {
    redirect("/admin/providers");
  }

  const query = parsed.data;
  const result = await getSmmProvidersPage(query);

  if (result.total > 0 && query.page > result.totalPages) {
    const params = new URLSearchParams();
    params.set("page", String(result.totalPages));
    if (query.pageSize !== 20) params.set("pageSize", String(query.pageSize));
    if (query.q) params.set("q", query.q);
    if (query.status) params.set("status", query.status);
    if (query.sort !== "updatedAt") params.set("sort", query.sort);
    if (query.order !== "desc") params.set("order", query.order);
    redirect(`/admin/providers?${params.toString()}`);
  }

  const isEmpty = result.total === 0 && !query.q && !query.status;

  return (
    <div className="flex flex-col gap-6">
      <ProvidersToolbar query={query} />

      {isEmpty ? (
        <Empty className="border border-border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HiOutlineServer className="size-5" />
            </EmptyMedia>
            <EmptyTitle>Sin providers todavía</EmptyTitle>
            <EmptyDescription>
              Agrega un panel SMM con su apiUrl y apiKey para sincronizar
              servicios.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              render={<Link href="/admin/providers/new" />}
              nativeButton={false}
            >
              Añadir provider
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <>
          <div className="hidden md:block">
            <ProvidersTable data={result.items} />
          </div>
          <div className="md:hidden">
            <ProvidersMobileList data={result.items} />
          </div>
          <ProvidersPagination
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
