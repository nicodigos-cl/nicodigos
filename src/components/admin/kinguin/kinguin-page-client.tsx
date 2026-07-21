"use client";

import { useMemo, useState } from "react";
import type { OnChangeFn, RowSelectionState } from "@tanstack/react-table";
import { toast } from "sonner";

import { BulkImportKinguinDialog } from "@/components/admin/kinguin/bulk-import-kinguin-dialog";
import { ExportKinguinAsProductsDialog } from "@/components/admin/kinguin/export-kinguin-as-products-dialog";
import { ImportKinguinDialog } from "@/components/admin/kinguin/import-kinguin-dialog";
import { KinguinActionsBar } from "@/components/admin/kinguin/kinguin-actions-bar";
import { KinguinResultsTable } from "@/components/admin/kinguin/kinguin-results-table";
import {
  clampBulkSelectionLimit,
  DEFAULT_BULK_SELECTION_LIMIT,
} from "@/lib/smm-services/constants";
import type { CategoryOptionDto } from "@/types/products";
import type { KinguinSearchHitDto } from "@/types/kinguin-admin";

type KinguinPageClientProps = {
  items: KinguinSearchHitDto[];
  categories: CategoryOptionDto[];
};

export function KinguinPageClient({
  items,
  categories,
}: KinguinPageClientProps) {
  const [selectionLimit, setSelectionLimit] = useState(
    DEFAULT_BULK_SELECTION_LIMIT,
  );
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [selectedById, setSelectedById] = useState<
    Record<string, KinguinSearchHitDto>
  >({});
  const [bulkOpen, setBulkOpen] = useState(false);
  const [exportProductsOpen, setExportProductsOpen] = useState(false);
  const [singleTarget, setSingleTarget] = useState<KinguinSearchHitDto | null>(
    null,
  );

  const selected = useMemo(
    () => Object.values(selectedById),
    [selectedById],
  );

  function syncSelection(
    nextSelection: RowSelectionState,
    catalog: KinguinSearchHitDto[],
  ) {
    const catalogById = new Map(
      catalog.map((item) => [String(item.kinguinId), item]),
    );
    setRowSelection(nextSelection);
    setSelectedById((prev) => {
      const next: Record<string, KinguinSearchHitDto> = {};
      for (const [id, selectedFlag] of Object.entries(nextSelection)) {
        if (!selectedFlag) continue;
        const fromCatalog = catalogById.get(id) ?? prev[id];
        if (fromCatalog && !fromCatalog.alreadyImported) {
          next[id] = fromCatalog;
        }
      }
      return next;
    });
  }

  function handleSelectionLimitChange(nextLimit: number) {
    const clamped = clampBulkSelectionLimit(nextLimit);
    setSelectionLimit(clamped);
    if (selected.length <= clamped) return;

    const kept = selected.slice(0, clamped);
    const nextSelection: RowSelectionState = {};
    const nextMap: Record<string, KinguinSearchHitDto> = {};
    for (const item of kept) {
      const id = String(item.kinguinId);
      nextSelection[id] = true;
      nextMap[id] = item;
    }
    setRowSelection(nextSelection);
    setSelectedById(nextMap);
    toast.message(`Selección recortada a ${clamped}`);
  }

  const handleRowSelectionChange: OnChangeFn<RowSelectionState> = (
    updater,
  ) => {
    const next =
      typeof updater === "function" ? updater(rowSelection) : updater;
    const selectedFlags = Object.entries(next).filter(([, value]) => value);
    if (selectedFlags.length > selectionLimit) {
      toast.error(`Máximo ${selectionLimit} productos`);
      return;
    }
    syncSelection(next, items);
  };

  function handleClear() {
    setRowSelection({});
    setSelectedById({});
  }

  function handleImported() {
    handleClear();
  }

  return (
    <>
      <KinguinActionsBar
        selectedCount={selected.length}
        selectionLimit={selectionLimit}
        onSelectionLimitChange={handleSelectionLimitChange}
        onClear={handleClear}
        onExportAsProducts={() => {
          if (selected.length === 0) return;
          setExportProductsOpen(true);
        }}
        onImport={() => {
          if (selected.length === 0) return;
          if (selected.length === 1) {
            setSingleTarget(selected[0] ?? null);
            return;
          }
          setBulkOpen(true);
        }}
      />

      <KinguinResultsTable
        items={items}
        selectionLimit={selectionLimit}
        rowSelection={rowSelection}
        onRowSelectionChange={handleRowSelectionChange}
        onImportOne={(hit) => setSingleTarget(hit)}
      />

      <ImportKinguinDialog
        open={singleTarget != null}
        onOpenChange={(open) => {
          if (!open) setSingleTarget(null);
        }}
        hit={singleTarget}
        categories={categories}
        onImported={handleImported}
      />

      <BulkImportKinguinDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        hits={selected}
        categories={categories}
        onImported={handleImported}
      />

      <ExportKinguinAsProductsDialog
        open={exportProductsOpen}
        onOpenChange={setExportProductsOpen}
        hits={selected}
        categories={categories}
      />
    </>
  );
}
