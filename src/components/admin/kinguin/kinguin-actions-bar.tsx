"use client";

import {
  HiOutlineDocumentDownload,
  HiOutlineTemplate,
  HiOutlineX,
} from "react-icons/hi";

import { Button } from "@/components/ui/button";
import { KINGUIN_SELECTION_LIMIT } from "@/lib/smm-services/constants";

type KinguinActionsBarProps = {
  selectedCount: number;
  onClear: () => void;
  onExportAsProducts: () => void;
  onImport: () => void;
};

export function KinguinActionsBar({
  selectedCount,
  onClear,
  onExportAsProducts,
  onImport,
}: KinguinActionsBarProps) {
  const canAct =
    selectedCount >= 1 && selectedCount <= KINGUIN_SELECTION_LIMIT;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="tabular-nums text-muted-foreground">
          {selectedCount} / {KINGUIN_SELECTION_LIMIT} seleccionados
        </span>
        {selectedCount > 0 ? (
          <Button type="button" variant="ghost" size="sm" onClick={onClear}>
            <HiOutlineX className="size-4" />
            Limpiar
          </Button>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-disabled={!canAct}
          className={!canAct ? "pointer-events-none opacity-50" : undefined}
          onClick={() => {
            if (!canAct) return;
            onExportAsProducts();
          }}
        >
          <HiOutlineDocumentDownload className="size-4" />
          Exportar como producto
        </Button>
        <Button
          type="button"
          size="sm"
          aria-disabled={!canAct}
          className={!canAct ? "pointer-events-none opacity-50" : undefined}
          onClick={() => {
            if (!canAct) return;
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
