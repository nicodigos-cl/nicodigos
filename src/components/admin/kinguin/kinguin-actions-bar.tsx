"use client";

import {
  HiOutlineDocumentDownload,
  HiOutlineTemplate,
  HiOutlineX,
} from "react-icons/hi";

import { SelectionLimitControl } from "@/components/admin/selection-limit-control";
import { Button } from "@/components/ui/button";
import {
  BULK_EXPORT_SELECTION_LIMIT,
  KINGUIN_PROCESS_LIMIT,
} from "@/lib/smm-services/constants";

type KinguinActionsBarProps = {
  selectedCount: number;
  selectionLimit: number;
  onSelectionLimitChange: (limit: number) => void;
  onClear: () => void;
  onExportAsProducts: () => void;
  onImport: () => void;
};

export function KinguinActionsBar({
  selectedCount,
  selectionLimit,
  onSelectionLimitChange,
  onClear,
  onExportAsProducts,
  onImport,
}: KinguinActionsBarProps) {
  const canExport =
    selectedCount >= 1 && selectedCount <= BULK_EXPORT_SELECTION_LIMIT;
  const canProcess =
    selectedCount >= 1 && selectedCount <= KINGUIN_PROCESS_LIMIT;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="tabular-nums text-muted-foreground">
          {selectedCount} / {selectionLimit} seleccionados
        </span>
        <SelectionLimitControl
          value={selectionLimit}
          onChange={onSelectionLimitChange}
        />
        {selectedCount > 0 ? (
          <Button type="button" variant="ghost" size="sm" onClick={onClear}>
            <HiOutlineX className="size-4" />
            Limpiar
          </Button>
        ) : null}
        {selectedCount > KINGUIN_PROCESS_LIMIT ? (
          <span className="text-xs text-muted-foreground">
            Importar: máx. {KINGUIN_PROCESS_LIMIT}
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-disabled={!canExport}
          className={!canExport ? "pointer-events-none opacity-50" : undefined}
          onClick={() => {
            if (!canExport) return;
            onExportAsProducts();
          }}
        >
          <HiOutlineDocumentDownload className="size-4" />
          Exportar como producto
        </Button>
        <Button
          type="button"
          size="sm"
          aria-disabled={!canProcess}
          className={!canProcess ? "pointer-events-none opacity-50" : undefined}
          onClick={() => {
            if (!canProcess) return;
            onImport();
          }}
        >
          <HiOutlineTemplate className="size-4" />
          Importar como producto
        </Button>
      </div>
    </div>
  );
}
