import { redirect } from "next/navigation";
import Link from "next/link";
import { HiOutlineFolder } from "react-icons/hi";

import { CategoriesMobileList } from "@/components/admin/categories/categories-mobile-list";
import { CategoriesPagination } from "@/components/admin/categories/categories-pagination";
import { CategoriesTable } from "@/components/admin/categories/categories-table";
import { CategoriesToolbar } from "@/components/admin/categories/categories-toolbar";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  getCategoriesPage,
  getCategoryParentOptions,
} from "@/lib/categories/queries";
import { categoriesListQuerySchema } from "@/lib/validations/categories";
import { parseSearchParamsRecord } from "@/lib/validations/products";

type CategoriesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CategoriesPage({
  searchParams,
}: CategoriesPageProps) {
  const rawParams = parseSearchParamsRecord(await searchParams);
  const parsed = categoriesListQuerySchema.safeParse(rawParams);

  if (!parsed.success) {
    redirect("/admin/categories");
  }

  const query = parsed.data;
  const [result, parentOptions] = await Promise.all([
    getCategoriesPage(query),
    getCategoryParentOptions(),
  ]);

  if (result.total > 0 && query.page > result.totalPages) {
    const params = new URLSearchParams();
    params.set("page", String(result.totalPages));
    if (query.pageSize !== 20) params.set("pageSize", String(query.pageSize));
    if (query.q) params.set("q", query.q);
    if (query.parentId) params.set("parentId", query.parentId);
    if (query.sort !== "updatedAt") params.set("sort", query.sort);
    if (query.order !== "desc") params.set("order", query.order);
    redirect(`/admin/categories?${params.toString()}`);
  }

  const isEmpty = result.total === 0 && !query.q && !query.parentId;

  return (
    <div className="flex flex-col gap-6">
      <CategoriesToolbar query={query} parentOptions={parentOptions} />

      {isEmpty ? (
        <Empty className="border border-border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HiOutlineFolder className="size-5" />
            </EmptyMedia>
            <EmptyTitle>Sin categorías todavía</EmptyTitle>
            <EmptyDescription>
              Crea categorías para organizar y filtrar productos del catálogo.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              render={<Link href="/admin/categories/new" />}
              nativeButton={false}
            >
              Añadir categoría
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <>
          <div className="hidden md:block">
            <CategoriesTable data={result.items} />
          </div>
          <div className="md:hidden">
            <CategoriesMobileList data={result.items} />
          </div>
          <CategoriesPagination
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
