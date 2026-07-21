"use client";

import { useState, useTransition } from "react";
import {
  HiOutlineArchive,
  HiOutlineCheckCircle,
  HiOutlineChevronDown,
  HiOutlineDocument,
  HiOutlineDocumentDownload,
  HiOutlineExclamation,
  HiOutlinePhotograph,
  HiOutlineRefresh,
  HiOutlineSparkles,
  HiOutlineTrash,
  HiOutlineViewGrid,
  HiOutlineX,
} from "react-icons/hi";
import { toast } from "sonner";

import { BulkCoverImageDialog } from "@/components/admin/products/bulk-cover-image-dialog";
import { SelectionLimitControl } from "@/components/admin/selection-limit-control";
import { confirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  bulkUpdateProductStatusAction,
  bulkDeleteProductsAction,
  bulkTranslateProductsAction,
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
  const [coverOpen, setCoverOpen] = useState(false);
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

  async function handleStatus(status: "ACTIVE" | "DRAFT" | "ARCHIVED") {
    if (!canProcess) return;
    const label =
      status === "ACTIVE"
        ? "publicar"
        : status === "DRAFT"
          ? "pasar a borrador"
          : "archivar";
    const confirmed = await confirmDialog({
      variant: status === "ARCHIVED" ? "warning" : "confirm",
      title: `${label.charAt(0).toUpperCase()}${label.slice(1)} productos`,
      description: `¿${label.charAt(0).toUpperCase()}${label.slice(1)} ${selectedCount} producto${selectedCount === 1 ? "" : "s"}?`,
      confirmLabel:
        status === "ACTIVE"
          ? "Publicar"
          : status === "DRAFT"
            ? "Pasar a borrador"
            : "Archivar",
    });
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
          .map(
            (item) =>
              `• ${item.name}${item.warning ? ` — ${item.warning}` : ""}`,
          )
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

  async function handleSyncKinguin() {
    if (!canSyncKinguin) return;
    const confirmed = await confirmDialog.confirm({
      title: "Sincronizar Kinguin",
      description: `¿Sincronizar ${kinguinSelected.length} producto${kinguinSelected.length === 1 ? "" : "s"} Kinguin (costo, ofertas y detalles)?`,
      confirmLabel: "Sincronizar",
    });
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

  async function handleDeletePermanent() {
    if (!canProcess) return;
    const confirmed = await confirmDialog.danger({
      title: "Eliminar definitivamente",
      description: `¿Borrar ${selectedCount} producto${selectedCount === 1 ? "" : "s"} para siempre? Los que tengan ventas se omitirán. No se puede deshacer.`,
      confirmLabel: "Eliminar para siempre",
    });
    if (!confirmed) return;

    startTransition(() => {
      void (async () => {
        const toastId = toast.loading("Eliminando productos…");
        const result = await bulkDeleteProductsAction({
          productIds: selected.map((item) => item.id),
        });
        if (!result.success) {
          toast.error(result.message, { id: toastId });
          return;
        }
        const { deleted, skipped } = result.data;
        if (skipped.length > 0) {
          toast.warning(
            `Eliminados ${deleted}. Omitidos ${skipped.length} (tienen ventas).`,
            { id: toastId, duration: 10_000 },
          );
        } else {
          toast.success(`Eliminados ${deleted} productos`, { id: toastId });
        }
        onClear();
        onRefresh();
      })();
    });
  }

  async function handleBulkTranslate() {
    if (!canProcess) return;
    const confirmed = await confirmDialog.confirm({
      title: "Traducir productos",
      description: `¿Traducir al español el texto de ${selectedCount} producto${selectedCount === 1 ? "" : "s"} (nombre, descripción, plataforma, región, géneros, idiomas, activación)? Se guardará en la base de datos.`,
      confirmLabel: "Traducir y guardar",
    });
    if (!confirmed) return;

    startTransition(() => {
      void (async () => {
        const toastId = toast.loading("Traduciendo productos…");
        const result = await bulkTranslateProductsAction({
          productIds: selected.map((item) => item.id),
          force: true,
        });
        if (!result.success) {
          toast.error(result.message, { id: toastId });
          return;
        }
        const { updated, skipped, failed } = result.data;
        toast.success(
          `Traducidos ${updated} · omitidos ${skipped}${
            failed.length ? ` · fallidos ${failed.length}` : ""
          }`,
          { id: toastId },
        );
        onClear();
        onRefresh();
      })();
    });
  }

  return (
    <>
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
              Procesar: máx. {PRODUCT_PROCESS_LIMIT}
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

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  size="sm"
                  disabled={isPending || selectedCount === 0 || undefined}
                />
              }
            >
              Acciones
              <HiOutlineChevronDown className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-56">
              <DropdownMenuItem
                disabled={!canProcess}
                onClick={() => handleStatus("ACTIVE")}
              >
                <HiOutlineCheckCircle className="size-4" />
                Publicar
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!canProcess}
                onClick={() => handleStatus("DRAFT")}
              >
                <HiOutlineDocument className="size-4" />
                Pasar a borrador
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!canProcess}
                onClick={() => handleStatus("ARCHIVED")}
              >
                <HiOutlineArchive className="size-4" />
                Archivar
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                disabled={!canProcess}
                onClick={() => {
                  void handleDeletePermanent();
                }}
              >
                <HiOutlineTrash className="size-4" />
                Eliminar definitivamente
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={!canProcess}
                onClick={() => {
                  if (!canProcess) return;
                  setCoverOpen(true);
                }}
              >
                <HiOutlinePhotograph className="size-4" />
                Cambiar foto
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!canProcess}
                onClick={handleCheckChile}
              >
                <HiOutlineExclamation className="size-4" />
                Verificar Chile
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!canProcess}
                onClick={() => {
                  void handleBulkTranslate();
                }}
              >
                <HiOutlineSparkles className="size-4" />
                Traducir textos
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!canSyncKinguin}
                onClick={handleSyncKinguin}
              >
                <HiOutlineRefresh className="size-4" />
                Sync Kinguin
                {kinguinSelected.length > 0
                  ? ` (${kinguinSelected.length})`
                  : ""}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={!canExport}
                onClick={handleExportSelected}
              >
                <HiOutlineDocumentDownload className="size-4" />
                Exportar JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <BulkCoverImageDialog
        open={coverOpen}
        onOpenChange={setCoverOpen}
        productIds={selected.map((item) => item.id)}
        onDone={() => {
          onClear();
          onRefresh();
        }}
      />
    </>
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
