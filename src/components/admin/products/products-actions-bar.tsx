"use client";

import { useTransition } from "react";
import {
  HiOutlineArchive,
  HiOutlineCheckCircle,
  HiOutlineDocument,
  HiOutlineDocumentDownload,
  HiOutlineExclamation,
  HiOutlineRefresh,
  HiOutlineViewGrid,
  HiOutlineX,
} from "react-icons/hi";
import { toast } from "sonner";

import { SelectionLimitControl } from "@/components/admin/selection-limit-control";
import { Button } from "@/components/ui/button";
import {
  bulkUpdateProductStatusAction,
  checkProductsChileCompatibilityAction,
  exportProductsAction,
  selectProductsForQueryAction,
  syncKinguinProductsAction,
} from "@/lib/actions/products-bulk";
import {
  BULK_EXPORT_SELECTION_LIMIT,
  PRODUCT_PROCESS_LIMIT,
} from "@/lib/smm-services/constants";
import type { ProductsListQuery } from "@/lib/validations/products";
import type { ImportProductItem } from "@/lib/validations/product-import";
import type { ProductListItemDto } from "@/types/products";

type ProductsActionsBarProps = {
  query: ProductsListQuery;
  selected: ProductListItemDto[];
  selectionLimit: number;
  onSelectionLimitChange: (limit: number) => void;
  onSelectAll: (items: ProductListItemDto[]) => void;
  onClear: () => void;
  onRefresh: () => void;
};

function downloadProductsJson(items: ImportProductItem[]) {
  const blob = new Blob([JSON.stringify({ items }, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  anchor.href = url;
  anchor.download = `products-export-${stamp}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ProductsActionsBar({
  query,
  selected,
  selectionLimit,
  onSelectionLimitChange,
  onSelectAll,
  onClear,
  onRefresh,
}: ProductsActionsBarProps) {
  const [isPending, startTransition] = useTransition();
  const selectedCount = selected.length;
  const canExport =
    selectedCount >= 1 && selectedCount <= BULK_EXPORT_SELECTION_LIMIT;
  const canProcess =
    selectedCount >= 1 && selectedCount <= PRODUCT_PROCESS_LIMIT;
  const kinguinSelected = selected.filter(
    (item) => item.deliveryMethod === "KINGUIN",
  );
  const canSyncKinguin =
    kinguinSelected.length >= 1 &&
    kinguinSelected.length <= PRODUCT_PROCESS_LIMIT;

  function handleSelectAll() {
    startTransition(() => {
      void (async () => {
        const result = await selectProductsForQueryAction({
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

  function handleStatus(status: "ACTIVE" | "DRAFT" | "ARCHIVED") {
    if (!canProcess) return;
    const label =
      status === "ACTIVE"
        ? "publicar"
        : status === "DRAFT"
          ? "pasar a borrador"
          : "archivar";
    const confirmed = window.confirm(
      `¿${label.charAt(0).toUpperCase()}${label.slice(1)} ${selectedCount} producto${selectedCount === 1 ? "" : "s"}?`,
    );
    if (!confirmed) return;

    startTransition(() => {
      void (async () => {
        const result = await bulkUpdateProductStatusAction({
          productIds: selected.map((item) => item.id),
          status,
        });
        if (!result.success) {
          toast.error(result.message);
          return;
        }
        toast.success(`Actualizados ${result.data.updated} productos`);
        onClear();
        onRefresh();
      })();
    });
  }

  function handleExportSelected() {
    if (!canExport) return;
    startTransition(() => {
      void (async () => {
        const result = await exportProductsAction({
          productIds: selected.map((item) => item.id),
        });
        if (!result.success) {
          toast.error(result.message);
          return;
        }
        downloadProductsJson(result.data.items);
        toast.success(`Exportados ${result.data.items.length} productos`);
      })();
    });
  }

  function handleCheckChile() {
    if (!canProcess) return;
    startTransition(() => {
      void (async () => {
        const toastId = toast.loading("Verificando compatibilidad Chile…");
        const result = await checkProductsChileCompatibilityAction({
          productIds: selected.map((item) => item.id),
        });
        if (!result.success) {
          toast.error(result.message, { id: toastId });
          return;
        }

        const { incompatible, compatibleCount, checked } = result.data;
        if (incompatible.length === 0) {
          toast.success(
            `${compatibleCount}/${checked} compatibles con Chile`,
            { id: toastId },
          );
          return;
        }

        const preview = incompatible
          .slice(0, 5)
          .map((item) => `• ${item.name}${item.warning ? ` — ${item.warning}` : ""}`)
          .join("\n");
        const more =
          incompatible.length > 5
            ? `\n…y ${incompatible.length - 5} más`
            : "";

        toast.error(
          `${incompatible.length}/${checked} no compatibles con Chile`,
          {
            id: toastId,
            description: `${preview}${more}`,
            duration: 12_000,
          },
        );
      })();
    });
  }

  function handleSyncKinguin() {
    if (!canSyncKinguin) return;
    const confirmed = window.confirm(
      `¿Sincronizar ${kinguinSelected.length} producto${kinguinSelected.length === 1 ? "" : "s"} Kinguin (costo, ofertas y detalles)?`,
    );
    if (!confirmed) return;

    startTransition(() => {
      void (async () => {
        const toastId = toast.loading("Sincronizando Kinguin…");
        const result = await syncKinguinProductsAction({
          productIds: kinguinSelected.map((item) => item.id),
        });
        if (!result.success) {
          toast.error(result.message, { id: toastId });
          return;
        }
        const { totals } = result.data;
        toast.success(
          `Sync: ${totals.synced} ok · ${totals.archived} archivados · ${totals.errors} errores · ${totals.skipped} omitidos${
            totals.repriced ? ` · ${totals.repriced} repreciados` : ""
          }`,
          { id: toastId },
        );
        onClear();
        onRefresh();
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
        {selectedCount > PRODUCT_PROCESS_LIMIT ? (
          <span className="text-xs text-muted-foreground">
            Procesar (publicar/archivar/sync): máx. {PRODUCT_PROCESS_LIMIT}
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
          <HiOutlineViewGrid className="size-4" />
          {isPending ? "Seleccionando..." : "Seleccionar todos"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-disabled={!canProcess}
          className={!canProcess ? "pointer-events-none opacity-50" : undefined}
          disabled={isPending || undefined}
          onClick={() => {
            if (!canProcess) return;
            handleStatus("ACTIVE");
          }}
        >
          <HiOutlineCheckCircle className="size-4" />
          Publicar
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-disabled={!canProcess}
          className={!canProcess ? "pointer-events-none opacity-50" : undefined}
          disabled={isPending || undefined}
          onClick={() => {
            if (!canProcess) return;
            handleStatus("DRAFT");
          }}
        >
          <HiOutlineDocument className="size-4" />
          Borrador
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-disabled={!canProcess}
          className={!canProcess ? "pointer-events-none opacity-50" : undefined}
          disabled={isPending || undefined}
          onClick={() => {
            if (!canProcess) return;
            handleStatus("ARCHIVED");
          }}
        >
          <HiOutlineArchive className="size-4" />
          Archivar
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-disabled={!canProcess}
          className={!canProcess ? "pointer-events-none opacity-50" : undefined}
          disabled={isPending || undefined}
          onClick={() => {
            if (!canProcess) return;
            handleCheckChile();
          }}
        >
          <HiOutlineExclamation className="size-4" />
          Verificar Chile
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-disabled={!canSyncKinguin}
          className={
            !canSyncKinguin ? "pointer-events-none opacity-50" : undefined
          }
          disabled={isPending || undefined}
          onClick={() => {
            if (!canSyncKinguin) return;
            handleSyncKinguin();
          }}
        >
          <HiOutlineRefresh className="size-4" />
          Sync Kinguin
          {kinguinSelected.length > 0 ? ` (${kinguinSelected.length})` : ""}
        </Button>
        <Button
          type="button"
          size="sm"
          aria-disabled={!canExport}
          className={!canExport ? "pointer-events-none opacity-50" : undefined}
          disabled={isPending || undefined}
          onClick={() => {
            if (!canExport) return;
            handleExportSelected();
          }}
        >
          <HiOutlineDocumentDownload className="size-4" />
          Exportar
        </Button>
      </div>
    </div>
  );
}

export function exportFilteredProductsAsJson(
  query: ProductsListQuery,
  onDone?: () => void,
) {
  return async () => {
    const result = await exportProductsAction({ query });
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    downloadProductsJson(result.data.items);
    toast.success(`Exportados ${result.data.items.length} productos`);
    onDone?.();
  };
}
