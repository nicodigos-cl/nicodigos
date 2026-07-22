import { HiOutlineSearch } from "react-icons/hi";

import { KinguinPageClient } from "@/components/admin/kinguin/kinguin-page-client";
import { KinguinPagination } from "@/components/admin/kinguin/kinguin-pagination";
import { KinguinToolbar } from "@/components/admin/kinguin/kinguin-toolbar";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { buildKinguinAdminHref, kinguinSearchHasCriteria } from "@/lib/kinguin/admin-url";
import {
  getCachedKinguinPlatforms,
  getCachedKinguinRegions,
} from "@/lib/kinguin/catalog-filters-cache";
import { searchKinguinProducts } from "@/lib/kinguin/search";
import { getCategoryOptions } from "@/lib/products/queries";
import { parseSearchParamsRecord } from "@/lib/validations/products";
import { kinguinSearchQuerySchema } from "@/lib/validations/kinguin";
import { redirect } from "next/navigation";

type KinguinPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function KinguinPage({ searchParams }: KinguinPageProps) {
  const raw = parseSearchParamsRecord(await searchParams);
  const parsed = kinguinSearchQuerySchema.safeParse(raw);

  if (!parsed.success) {
    redirect("/admin/kinguin");
  }

  const query = parsed.data;
  const hasCriteria = kinguinSearchHasCriteria(query);

  const [categories, platforms, regions] = await Promise.all([
    getCategoryOptions(),
    getCachedKinguinPlatforms(),
    getCachedKinguinRegions(),
  ]);

  let result: Awaited<ReturnType<typeof searchKinguinProducts>> = {
    items: [],
    total: 0,
    page: query.page,
    pageSize: query.pageSize,
    totalPages: 1,
    q: query.q ?? "",
  };
  let searchError: string | null = null;

  if (hasCriteria) {
    try {
      result = await searchKinguinProducts(query);
    } catch (error) {
      searchError =
        error instanceof Error
          ? error.message.slice(0, 300)
          : "Error al buscar en Kinguin";
    }
  }

  if (result.total > 0 && query.page > result.totalPages) {
    redirect(
      buildKinguinAdminHref(query, { page: result.totalPages }),
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <KinguinToolbar
        query={query}
        platforms={platforms}
        regions={regions}
      />

      {!hasCriteria ? (
        <Empty className="border border-border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HiOutlineSearch className="size-5" />
            </EmptyMedia>
            <EmptyTitle>Busca o filtra productos</EmptyTitle>
            <EmptyDescription>
              Escribe un nombre (Enter) o elige plataforma / región / tipo en
              Filtros. Los resultados vienen en vivo desde la API de Kinguin.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : searchError ? (
        <p className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-6 text-sm text-destructive">
          {searchError}
        </p>
      ) : (
        <>
          <KinguinPageClient
            items={result.items}
            categories={categories}
          />
          <KinguinPagination
            page={result.page}
            pageSize={result.pageSize}
            total={result.total}
            totalPages={result.totalPages}
            query={query}
            visibleCount={result.items.length}
          />
        </>
      )}
    </div>
  );
}
