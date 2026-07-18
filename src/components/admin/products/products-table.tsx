"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { OnChangeFn, SortingState } from "@tanstack/react-table";

import { productsColumns } from "@/components/admin/products/products-columns";
import { DataTable } from "@/components/data-table";
import type { ProductsListQuery, ProductsSortField } from "@/lib/validations/products";
import type { ProductListItemDto } from "@/types/products";

const SORTABLE_COLUMNS = new Set<ProductsSortField>([
  "name",
  "price",
  "qty",
  "status",
]);

function buildProductsHref(
  query: ProductsListQuery,
  sort: ProductsSortField,
  order: "asc" | "desc",
): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.pageSize !== 20) params.set("pageSize", String(query.pageSize));
  if (query.category) params.set("category", query.category);
  if (query.status) params.set("status", query.status);
  if (query.deliveryMethod) {
    params.set("deliveryMethod", query.deliveryMethod);
  }
  if (sort !== "updatedAt") params.set("sort", sort);
  if (order !== "desc") params.set("order", order);

  const qs = params.toString();
  return qs ? `/admin/products?${qs}` : "/admin/products";
}

type ProductsTableProps = {
  data: ProductListItemDto[];
  query: ProductsListQuery;
};

export function ProductsTable({ data, query }: ProductsTableProps) {
  const router = useRouter();

  const sorting = useMemo<SortingState>(() => {
    if (!SORTABLE_COLUMNS.has(query.sort)) {
      return [];
    }
    return [{ id: query.sort, desc: query.order === "desc" }];
  }, [query.order, query.sort]);

  const onSortingChange = useCallback<OnChangeFn<SortingState>>(
    (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      const first = next[0];

      if (!first || !SORTABLE_COLUMNS.has(first.id as ProductsSortField)) {
        router.push(buildProductsHref(query, "updatedAt", "desc"));
        return;
      }

      router.push(
        buildProductsHref(
          query,
          first.id as ProductsSortField,
          first.desc ? "desc" : "asc",
        ),
      );
    },
    [query, router, sorting],
  );

  return (
    <DataTable
      columns={productsColumns}
      data={data}
      manual
      hideToolbar
      hidePagination
      sorting={sorting}
      onSortingChange={onSortingChange}
      emptyMessage="No hay productos para mostrar."
    />
  );
}
