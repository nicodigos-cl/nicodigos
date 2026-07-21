"use client";

import { useTransition } from "react";
import {
  HiOutlineCheckCircle,
  HiOutlineDownload,
  HiOutlineDocumentDownload,
  HiOutlineTemplate,
  HiOutlineX,
} from "react-icons/hi";
import { toast } from "sonner";

import { SelectionLimitControl } from "@/components/admin/selection-limit-control";
import { Button } from "@/components/ui/button";
import { selectSmmServicesForQueryAction } from "@/lib/actions/smm-service-products";
import {
  BULK_EXPORT_SELECTION_LIMIT,
  SMM_SERVICE_PROCESS_LIMIT,
} from "@/lib/smm-services/constants";
import type { ServicesListQuery } from "@/lib/validations/smm-providers";
import type { SmmServiceListItemDto } from "@/types/smm-provider";

type ServicesActionsBarProps = {
  query: ServicesListQuery;
  selectedCount: number;
  selectionLimit: number;
  onSelectionLimitChange: (limit: number) => void;
  onSelectAll: (items: SmmServiceListItemDto[]) => void;
  onClear: () => void;
  onExport: () => void;
  onExportAsProducts: () => void;
  onConvert: () => void;
};

export function ServicesActionsBar({
  query,
  selectedCount,
  selectionLimit,
  onSelectionLimitChange,
  onSelectAll,
  onClear,
  onExport,
  onExportAsProducts,
  onConvert,
}: ServicesActionsBarProps) {
  const [isPending, startTransition] = useTransition();
  const canExport =
    selectedCount >= 1 && selectedCount <= BULK_EXPORT_SELECTION_LIMIT;
  const canProcess =
    selectedCount >= 1 && selectedCount <= SMM_SERVICE_PROCESS_LIMIT;

  function handleSelectAll() {
    startTransition(() => {
      void (async () => {
        const result = await selectSmmServicesForQueryAction({
          query,
          limit: selectionLimit,
        });
        if (!result.success) {
          toast.error(result.message);
          return;
        }
        onSelectAll(result.data.items);
        toast.success(
          `Seleccionados ${result.data.items.length} (límite ${selectionLimit})`,
        );
      })();
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="tabular-nums text-muted-foreground">
          {selectedCount} / {selectionLimit} seleccionados
        </span>
        <SelectionLimitControl
          value={selectionLimit}
          onChange={onSelectionLimitChange}
          disabled={isPending}
        />
        {selectedCount > 0 ? (
          <Button type="button" variant="ghost" size="sm" onClick={onClear}>
            <HiOutlineX className="size-4" />
            Limpiar
          </Button>
        ) : null}
        {selectedCount > SMM_SERVICE_PROCESS_LIMIT ? (
          <span className="text-xs text-muted-foreground">
            Convertir: máx. {SMM_SERVICE_PROCESS_LIMIT}
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending || undefined}
          onClick={handleSelectAll}
        >
          <HiOutlineCheckCircle className="size-4" />
          {isPending ? "Seleccionando..." : "Seleccionar todos"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-disabled={!canExport}
          className={!canExport ? "pointer-events-none opacity-50" : undefined}
          onClick={() => {
            if (!canExport) return;
            onExport();
          }}
        >
          <HiOutlineDownload className="size-4" />
          Exportar JSON
        </Button>
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
            onConvert();
          }}
        >
          <HiOutlineTemplate className="size-4" />
          Convertir a producto
        </Button>
      </div>
    </div>
  );
}

export function exportServicesAsJson(services: SmmServiceListItemDto[]) {
  const payload = services.map((service) => ({
    id: service.id,
    providerId: service.providerId,
    providerName: service.providerName,
    providerSlug: service.providerSlug,
    providerApiUrl: service.providerApiUrl,
    remoteServiceId: service.remoteServiceId,
    name: service.name,
    type: service.type,
    category: service.category,
    rate: service.rate,
    min: service.min,
    max: service.max,
    refill: service.refill,
    cancel: service.cancel,
    isActive: service.isActive,
  }));

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  anchor.href = url;
  anchor.download = `smm-services-${stamp}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
