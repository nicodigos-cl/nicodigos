"use client";

import { useTransition } from "react";
import {
  HiOutlineArchive,
  HiOutlineCheckCircle,
  HiOutlineDocument,
  HiOutlineDocumentDownload,
  HiOutlineViewGrid,
  HiOutlineX,
} from "react-icons/hi";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  bulkUpdateProductStatusAction,
  exportProductsAction,
  selectProductsForQueryAction,
} from "@/lib/actions/products-bulk";
import { PRODUCT_SELECTION_LIMIT } from "@/lib/smm-services/constants";
import type { ProductsListQuery } from "@/lib/validations/products";
import type { ImportProductItem } from "@/lib/validations/product-import";
import type { ProductListItemDto } from "@/types/products";

type ProductsActionsBarProps = {
  query: ProductsListQuery;
  selected: ProductListItemDto[];
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
  onSelectAll,
  onClear,
  onRefresh,
}: ProductsActionsBarProps) {
  const [isPending, startTransition] = useTransition();
  const selectedCount = selected.length;
  const canAct =
    selectedCount >= 1 && selectedCount <= PRODUCT_SELECTION_LIMIT;

  function handleSelectAll() {
    startTransition(() => {
      void (async () => {
        const result = await selectProductsForQueryAction({
          query,
          limit: PRODUCT_SELECTION_LIMIT,
        });
        if (!result.success) {
          toast.error(result.message);
          return;
        }
        onSelectAll(result.data.items);
        toast.success(
          `Seleccionados ${result.data.items.length} (máx. ${PRODUCT_SELECTION_LIMIT})`,
        );
      })();
    });
  }

  function handleStatus(status: "ACTIVE" | "DRAFT" | "ARCHIVED") {
    if (!canAct) return;
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
    if (!canAct) return;
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

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="tabular-nums text-muted-foreground">
          {selectedCount} / {PRODUCT_SELECTION_LIMIT} seleccionados
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
          <HiOutlineViewGrid className="size-4" />
          {isPending
            ? "Seleccionando..."
            : `Seleccionar todos (máx. ${PRODUCT_SELECTION_LIMIT})`}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-disabled={!canAct}
          className={!canAct ? "pointer-events-none opacity-50" : undefined}
          disabled={isPending || undefined}
          onClick={() => {
            if (!canAct) return;
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
          aria-disabled={!canAct}
          className={!canAct ? "pointer-events-none opacity-50" : undefined}
          disabled={isPending || undefined}
          onClick={() => {
            if (!canAct) return;
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
          aria-disabled={!canAct}
          className={!canAct ? "pointer-events-none opacity-50" : undefined}
          disabled={isPending || undefined}
          onClick={() => {
            if (!canAct) return;
            handleStatus("ARCHIVED");
          }}
        >
          <HiOutlineArchive className="size-4" />
          Archivar
        </Button>
        <Button
          type="button"
          size="sm"
          aria-disabled={!canAct}
          className={!canAct ? "pointer-events-none opacity-50" : undefined}
          disabled={isPending || undefined}
          onClick={() => {
            if (!canAct) return;
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
