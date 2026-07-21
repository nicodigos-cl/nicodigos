"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { OnChangeFn, RowSelectionState } from "@tanstack/react-table";
import { toast } from "sonner";

import { ProductsActionsBar } from "@/components/admin/products/products-actions-bar";
import { ProductsMobileList } from "@/components/admin/products/products-mobile-list";
import { ProductsPagination } from "@/components/admin/products/products-pagination";
import { ProductsTable } from "@/components/admin/products/products-table";
import { PRODUCT_SELECTION_LIMIT } from "@/lib/smm-services/constants";
import type { ProductsListQuery } from "@/lib/validations/products";
import type { ProductListItemDto } from "@/types/products";

type ProductsPageClientProps = {
  query: ProductsListQuery;
  items: ProductListItemDto[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export function ProductsPageClient({
  query,
  items,
  page,
  pageSize,
  total,
  totalPages,
}: ProductsPageClientProps) {
  const router = useRouter();
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [selectedById, setSelectedById] = useState<
    Record<string, ProductListItemDto>
  >({});

  const selected = useMemo(
    () => Object.values(selectedById),
    [selectedById],
  );
  const selectedIds = useMemo(
    () => new Set(Object.keys(selectedById)),
    [selectedById],
  );

  function syncSelection(
    nextSelection: RowSelectionState,
    catalog: ProductListItemDto[],
  ) {
    const catalogById = new Map(catalog.map((item) => [item.id, item]));
    setRowSelection(nextSelection);
    setSelectedById((prev) => {
      const next: Record<string, ProductListItemDto> = {};
      for (const [id, selectedFlag] of Object.entries(nextSelection)) {
        if (!selectedFlag) continue;
        const fromCatalog = catalogById.get(id) ?? prev[id];
        if (fromCatalog) {
          next[id] = fromCatalog;
        }
      }
      return next;
    });
  }

  const handleRowSelectionChange: OnChangeFn<RowSelectionState> = (
    updater,
  ) => {
    const next =
      typeof updater === "function" ? updater(rowSelection) : updater;
    const selectedFlags = Object.entries(next).filter(([, value]) => value);
    if (selectedFlags.length > PRODUCT_SELECTION_LIMIT) {
      toast.error(`Máximo ${PRODUCT_SELECTION_LIMIT} productos`);
      return;
    }
    syncSelection(next, items);
  };

  function handleSelectAll(allItems: ProductListItemDto[]) {
    const nextSelection: RowSelectionState = {};
    const nextMap: Record<string, ProductListItemDto> = {};
    for (const item of allItems.slice(0, PRODUCT_SELECTION_LIMIT)) {
      nextSelection[item.id] = true;
      nextMap[item.id] = item;
    }
    setRowSelection(nextSelection);
    setSelectedById(nextMap);
  }

  function handleClear() {
    setRowSelection({});
    setSelectedById({});
  }

  function handleMobileToggle(
    product: ProductListItemDto,
    selectedFlag: boolean,
  ) {
    if (
      selectedFlag &&
      selectedIds.size >= PRODUCT_SELECTION_LIMIT &&
      !selectedIds.has(product.id)
    ) {
      toast.error(`Máximo ${PRODUCT_SELECTION_LIMIT} productos`);
      return;
    }

    setSelectedById((prev) => {
      const next = { ...prev };
      if (selectedFlag) {
        next[product.id] = product;
      } else {
        delete next[product.id];
      }
      return next;
    });
    setRowSelection((prev) => {
      const next = { ...prev };
      if (selectedFlag) {
        next[product.id] = true;
      } else {
        delete next[product.id];
      }
      return next;
    });
  }

  return (
    <>
      <ProductsActionsBar
        query={query}
        selected={selected}
        onSelectAll={handleSelectAll}
        onClear={handleClear}
        onRefresh={() => router.refresh()}
      />

      <div className="hidden md:block">
        <ProductsTable
          data={items}
          query={query}
          rowSelection={rowSelection}
          onRowSelectionChange={handleRowSelectionChange}
        />
      </div>
      <div className="md:hidden">
        <ProductsMobileList
          data={items}
          selectedIds={selectedIds}
          onToggle={handleMobileToggle}
        />
      </div>

      <ProductsPagination
        page={page}
        pageSize={pageSize}
        total={total}
        totalPages={totalPages}
        query={query}
      />
    </>
  );
}
