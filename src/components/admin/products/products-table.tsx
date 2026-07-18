"use client";

import { DataTable } from "@/components/data-table";
import { productsColumns } from "@/components/admin/products/products-columns";
import type { ProductListItemDto } from "@/types/products";

type ProductsTableProps = {
  data: ProductListItemDto[];
};

export function ProductsTable({ data }: ProductsTableProps) {
  return (
    <DataTable
      columns={productsColumns}
      data={data}
      manual
      hideToolbar
      hidePagination
      emptyMessage="No hay productos para mostrar."
    />
  );
}
