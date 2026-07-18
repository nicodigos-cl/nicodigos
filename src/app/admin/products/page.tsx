import { redirect } from "next/navigation";
import { HiOutlineCube } from "react-icons/hi";
import Link from "next/link";

import { ProductsMobileList } from "@/components/admin/products/products-mobile-list";
import { ProductsPagination } from "@/components/admin/products/products-pagination";
import { ProductsTable } from "@/components/admin/products/products-table";
import { ProductsToolbar } from "@/components/admin/products/products-toolbar";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { getCategoryOptions, getProductsPage } from "@/lib/products/queries";
import {
  parseSearchParamsRecord,
  productsListQuerySchema,
} from "@/lib/validations/products";

type ProductsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ProductsPage({
  searchParams,
}: ProductsPageProps) {
  const rawParams = parseSearchParamsRecord(await searchParams);
  const parsed = productsListQuerySchema.safeParse(rawParams);

  if (!parsed.success) {
    redirect("/admin/products");
  }

  const query = parsed.data;
  const [categories, result] = await Promise.all([
    getCategoryOptions(),
    getProductsPage(query),
  ]);

  if (result.total > 0 && query.page > result.totalPages) {
    const params = new URLSearchParams();
    params.set("page", String(result.totalPages));
    if (query.pageSize !== 20) params.set("pageSize", String(query.pageSize));
    if (query.q) params.set("q", query.q);
    if (query.category) params.set("category", query.category);
    if (query.status) params.set("status", query.status);
    if (query.deliveryMethod) {
      params.set("deliveryMethod", query.deliveryMethod);
    }
    if (query.sort !== "updatedAt") params.set("sort", query.sort);
    if (query.order !== "desc") params.set("order", query.order);
    redirect(`/admin/products?${params.toString()}`);
  }

  const isEmpty =
    result.total === 0 &&
    !query.q &&
    !query.category &&
    !query.status &&
    !query.deliveryMethod;

  return (
    <div className="flex flex-col gap-6">
      <ProductsToolbar query={query} categories={categories} />

      {isEmpty ? (
        <Empty className="border border-border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HiOutlineCube className="size-5" />
            </EmptyMedia>
            <EmptyTitle>Sin productos todavía</EmptyTitle>
            <EmptyDescription>
              Crea el primer producto para empezar a gestionar tu inventario,
              precios y códigos de activación.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              render={<Link href="/admin/products/new" />}
              nativeButton={false}
            >
              Añadir producto
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <>
          <div className="hidden md:block">
            <ProductsTable data={result.items} />
          </div>
          <div className="md:hidden">
            <ProductsMobileList data={result.items} />
          </div>
          <ProductsPagination
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
