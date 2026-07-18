import { redirect } from "next/navigation";
import { HiOutlineCollection } from "react-icons/hi";

import { ServicesPageClient } from "@/components/admin/smm-services/services-page-client";
import { ServicesToolbar } from "@/components/admin/smm-services/services-toolbar";
import { SyncServicesDialog } from "@/components/admin/smm-services/sync-services-dialog";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { getCategoryOptions } from "@/lib/products/queries";
import {
  getSmmProviderOptions,
  getSmmServiceCategories,
  getSmmServicesPage,
} from "@/lib/smm-providers/queries";
import { parseSearchParamsRecord } from "@/lib/validations/products";
import { servicesListQuerySchema } from "@/lib/validations/smm-providers";

type ServicesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ServicesPage({
  searchParams,
}: ServicesPageProps) {
  const rawParams = parseSearchParamsRecord(await searchParams);
  const parsed = servicesListQuerySchema.safeParse(rawParams);

  if (!parsed.success) {
    redirect("/admin/services");
  }

  const query = parsed.data;
  const [result, providers, categories, storeCategories] = await Promise.all([
    getSmmServicesPage(query),
    getSmmProviderOptions(),
    getSmmServiceCategories(query.providerId),
    getCategoryOptions(),
  ]);

  if (result.total > 0 && query.page > result.totalPages) {
    const params = new URLSearchParams();
    params.set("page", String(result.totalPages));
    if (query.pageSize !== 20) params.set("pageSize", String(query.pageSize));
    if (query.q) params.set("q", query.q);
    if (query.providerId) params.set("providerId", query.providerId);
    if (query.category) params.set("category", query.category);
    if (query.isActive) params.set("isActive", query.isActive);
    if (query.sort !== "updatedAt") params.set("sort", query.sort);
    if (query.order !== "desc") params.set("order", query.order);
    redirect(`/admin/services?${params.toString()}`);
  }

  const isEmpty =
    result.total === 0 &&
    !query.q &&
    !query.providerId &&
    !query.category &&
    !query.isActive;

  return (
    <div className="flex flex-col gap-6">
      <ServicesToolbar
        query={query}
        providers={providers}
        categories={categories}
      />

      {isEmpty ? (
        <Empty className="border border-border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HiOutlineCollection className="size-5" />
            </EmptyMedia>
            <EmptyTitle>Sin servicios todavía</EmptyTitle>
            <EmptyDescription>
              Sincroniza un provider SMM para importar su catálogo de servicios
              a la base de datos.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <SyncServicesDialog providers={providers} />
          </EmptyContent>
        </Empty>
      ) : (
        <ServicesPageClient
          query={query}
          items={result.items}
          page={result.page}
          pageSize={result.pageSize}
          total={result.total}
          totalPages={result.totalPages}
          categories={storeCategories}
        />
      )}
    </div>
  );
}
