"use client";

import { useTransition } from "react";
import {
  HiOutlineCheckCircle,
  HiOutlineDownload,
  HiOutlineTemplate,
  HiOutlineX,
} from "react-icons/hi";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { selectSmmServicesForQueryAction } from "@/lib/actions/smm-service-products";
import { SMM_SERVICE_SELECTION_LIMIT } from "@/lib/smm-services/constants";
import type { ServicesListQuery } from "@/lib/validations/smm-providers";
import type { SmmServiceListItemDto } from "@/types/smm-provider";

type ServicesActionsBarProps = {
  query: ServicesListQuery;
  selectedCount: number;
  onSelectAll: (items: SmmServiceListItemDto[]) => void;
  onClear: () => void;
  onExport: () => void;
  onConvert: () => void;
};

export function ServicesActionsBar({
  query,
  selectedCount,
  onSelectAll,
  onClear,
  onExport,
  onConvert,
}: ServicesActionsBarProps) {
  const [isPending, startTransition] = useTransition();
  const canAct =
    selectedCount >= 1 && selectedCount <= SMM_SERVICE_SELECTION_LIMIT;

  function handleSelectAll() {
    startTransition(() => {
      void (async () => {
        const result = await selectSmmServicesForQueryAction({
          query,
          limit: SMM_SERVICE_SELECTION_LIMIT,
        });
        if (!result.success) {
          toast.error(result.message);
          return;
        }
        onSelectAll(result.data.items);
        toast.success(
          `Seleccionados ${result.data.items.length} (máx. ${SMM_SERVICE_SELECTION_LIMIT})`,
        );
      })();
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="tabular-nums text-muted-foreground">
          {selectedCount} / {SMM_SERVICE_SELECTION_LIMIT} seleccionados
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
          disabled={isPending || undefined}
          onClick={handleSelectAll}
        >
          <HiOutlineCheckCircle className="size-4" />
          {isPending
            ? "Seleccionando..."
            : `Seleccionar todos (máx. ${SMM_SERVICE_SELECTION_LIMIT})`}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-disabled={!canAct}
          className={!canAct ? "pointer-events-none opacity-50" : undefined}
          onClick={() => {
            if (!canAct) return;
            onExport();
          }}
        >
          <HiOutlineDownload className="size-4" />
          Exportar JSON
        </Button>
        <Button
          type="button"
          size="sm"
          aria-disabled={!canAct}
          className={!canAct ? "pointer-events-none opacity-50" : undefined}
          onClick={() => {
            if (!canAct) return;
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
