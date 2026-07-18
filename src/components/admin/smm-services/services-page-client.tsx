"use client";

import { useMemo, useState } from "react";
import type { OnChangeFn, RowSelectionState } from "@tanstack/react-table";
import { toast } from "sonner";

import { BulkConvertServicesDialog } from "@/components/admin/smm-services/bulk-convert-services-dialog";
import { ConvertServiceDialog } from "@/components/admin/smm-services/convert-service-dialog";
import {
  exportServicesAsJson,
  ServicesActionsBar,
} from "@/components/admin/smm-services/services-actions-bar";
import { ServicesMobileList } from "@/components/admin/smm-services/services-mobile-list";
import { ServicesPagination } from "@/components/admin/smm-services/services-pagination";
import { ServicesTable } from "@/components/admin/smm-services/services-table";
import { SMM_SERVICE_SELECTION_LIMIT } from "@/lib/smm-services/constants";
import type { ServicesListQuery } from "@/lib/validations/smm-providers";
import type { CategoryOptionDto } from "@/types/products";
import type { SmmServiceListItemDto } from "@/types/smm-provider";

type ServicesPageClientProps = {
  query: ServicesListQuery;
  items: SmmServiceListItemDto[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  categories: CategoryOptionDto[];
};

export function ServicesPageClient({
  query,
  items,
  page,
  pageSize,
  total,
  totalPages,
  categories,
}: ServicesPageClientProps) {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [selectedById, setSelectedById] = useState<
    Record<string, SmmServiceListItemDto>
  >({});
  const [convertOpen, setConvertOpen] = useState(false);

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
    catalog: SmmServiceListItemDto[],
  ) {
    const catalogById = new Map(catalog.map((item) => [item.id, item]));
    setRowSelection(nextSelection);
    setSelectedById((prev) => {
      const next: Record<string, SmmServiceListItemDto> = {};
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
    if (selectedFlags.length > SMM_SERVICE_SELECTION_LIMIT) {
      toast.error(`Máximo ${SMM_SERVICE_SELECTION_LIMIT} servicios`);
      return;
    }
    syncSelection(next, items);
  };

  function handleSelectAll(allItems: SmmServiceListItemDto[]) {
    const nextSelection: RowSelectionState = {};
    const nextMap: Record<string, SmmServiceListItemDto> = {};
    for (const item of allItems.slice(0, SMM_SERVICE_SELECTION_LIMIT)) {
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
    service: SmmServiceListItemDto,
    selectedFlag: boolean,
  ) {
    if (
      selectedFlag &&
      selectedIds.size >= SMM_SERVICE_SELECTION_LIMIT &&
      !selectedIds.has(service.id)
    ) {
      toast.error(`Máximo ${SMM_SERVICE_SELECTION_LIMIT} servicios`);
      return;
    }

    setSelectedById((prev) => {
      const next = { ...prev };
      if (selectedFlag) {
        next[service.id] = service;
      } else {
        delete next[service.id];
      }
      return next;
    });
    setRowSelection((prev) => {
      const next = { ...prev };
      if (selectedFlag) {
        next[service.id] = true;
      } else {
        delete next[service.id];
      }
      return next;
    });
  }

  function handleConvert() {
    if (selected.length === 0) return;
    setConvertOpen(true);
  }

  return (
    <>
      <ServicesActionsBar
        query={query}
        selectedCount={selected.length}
        onSelectAll={handleSelectAll}
        onClear={handleClear}
        onExport={() => {
          exportServicesAsJson(selected);
          toast.success("JSON descargado");
        }}
        onConvert={handleConvert}
      />

      <div className="hidden md:block">
        <ServicesTable
          data={items}
          rowSelection={rowSelection}
          onRowSelectionChange={handleRowSelectionChange}
        />
      </div>
      <div className="md:hidden">
        <ServicesMobileList
          data={items}
          selectedIds={selectedIds}
          onToggle={handleMobileToggle}
        />
      </div>

      <ServicesPagination
        page={page}
        pageSize={pageSize}
        total={total}
        totalPages={totalPages}
        query={query}
      />

      {selected.length === 1 ? (
        <ConvertServiceDialog
          open={convertOpen}
          onOpenChange={setConvertOpen}
          service={selected[0] ?? null}
          categories={categories}
        />
      ) : null}

      {selected.length > 1 ? (
        <BulkConvertServicesDialog
          open={convertOpen}
          onOpenChange={setConvertOpen}
          services={selected}
          categories={categories}
        />
      ) : null}
    </>
  );
}
