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
  const categories = await getCategoryOptions();

  let result: Awaited<ReturnType<typeof searchKinguinProducts>> = {
    items: [],
    total: 0,
    page: query.page,
    pageSize: query.pageSize,
    totalPages: 1,
    q: query.q ?? "",
  };
  let searchError: string | null = null;

  if (query.q) {
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
    const params = new URLSearchParams();
    if (query.q) params.set("q", query.q);
    params.set("page", String(result.totalPages));
    if (query.pageSize !== 20) params.set("pageSize", String(query.pageSize));
    redirect(`/admin/kinguin?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <KinguinToolbar query={query} />

      {!query.q ? (
        <Empty className="border border-border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HiOutlineSearch className="size-5" />
            </EmptyMedia>
            <EmptyTitle>Busca un juego</EmptyTitle>
            <EmptyDescription>
              Escribe un nombre y pulsa Enter. Los resultados vienen en vivo
              desde la API de Kinguin.
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
          />
        </>
      )}
    </div>
  );
}
