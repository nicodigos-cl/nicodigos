"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import type {
  ColumnDef,
  OnChangeFn,
  RowSelectionState,
  SortingState,
} from "@tanstack/react-table";

import { productsColumns } from "@/components/admin/products/products-columns";
import { DataTable } from "@/components/data-table";
import { Checkbox } from "@/components/ui/checkbox";
import { PRODUCT_SELECTION_LIMIT } from "@/lib/smm-services/constants";
import type {
  ProductsListQuery,
  ProductsSortField,
} from "@/lib/validations/products";
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
  rowSelection: RowSelectionState;
  onRowSelectionChange: OnChangeFn<RowSelectionState>;
};

export function ProductsTable({
  data,
  query,
  rowSelection,
  onRowSelectionChange,
}: ProductsTableProps) {
  const router = useRouter();
  const selectedCount = Object.values(rowSelection).filter(Boolean).length;

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

  const columns = useMemo<ColumnDef<ProductListItemDto>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            indeterminate={
              table.getIsSomePageRowsSelected() &&
              !table.getIsAllPageRowsSelected()
            }
            onCheckedChange={(value) => {
              if (value) {
                const next: RowSelectionState = { ...rowSelection };
                for (const row of table.getRowModel().rows) {
                  if (
                    Object.values(next).filter(Boolean).length >=
                    PRODUCT_SELECTION_LIMIT
                  ) {
                    break;
                  }
                  next[row.id] = true;
                }
                onRowSelectionChange(next);
                return;
              }
              table.toggleAllPageRowsSelected(false);
            }}
            aria-label="Seleccionar página"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            disabled={
              !row.getIsSelected() &&
              selectedCount >= PRODUCT_SELECTION_LIMIT
            }
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Seleccionar fila"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      ...productsColumns,
    ],
    [onRowSelectionChange, rowSelection, selectedCount],
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      manual
      hideToolbar
      hidePagination
      enableRowSelection
      rowSelection={rowSelection}
      onRowSelectionChange={onRowSelectionChange}
      sorting={sorting}
      onSortingChange={onSortingChange}
      getRowId={(row) => row.id}
      emptyMessage="No hay productos para mostrar."
    />
  );
}
