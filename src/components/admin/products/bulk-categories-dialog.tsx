"use client";

import { useMemo, useState, useTransition } from "react";
import { HiOutlineFolder } from "react-icons/hi";
import { toast } from "sonner";

import { CategoryCombobox } from "@/components/admin/category-combobox";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { bulkUpdateProductCategoriesAction } from "@/lib/actions/products-bulk";
import type { CategoryOptionDto } from "@/types/products";

type BulkCategoriesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productIds: string[];
  categories: CategoryOptionDto[];
  onDone: () => void;
};

export function BulkCategoriesDialog({
  open,
  onOpenChange,
  productIds,
  categories,
  onDone,
}: BulkCategoriesDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [categoryIds, setCategoryIds] = useState<string[]>([]);

  const selectedCount = productIds.length;
  const selectedNames = useMemo(() => {
    const byId = new Map(categories.map((category) => [category.id, category.name]));
    return categoryIds
      .map((id) => byId.get(id))
      .filter((name): name is string => Boolean(name));
  }, [categories, categoryIds]);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setCategoryIds([]);
    }
    onOpenChange(next);
  }

  function handleSubmit() {
    if (selectedCount === 0) return;

    startTransition(() => {
      void (async () => {
        const result = await bulkUpdateProductCategoriesAction({
          productIds,
          categoryIds,
        });
        if (!result.success) {
          toast.error(result.message);
          return;
        }

        toast.success(
          categoryIds.length === 0
            ? `Categorías quitadas en ${result.data.updated} producto${result.data.updated === 1 ? "" : "s"}`
            : `Categoría${categoryIds.length === 1 ? "" : "s"} actualizada${categoryIds.length === 1 ? "" : "s"} en ${result.data.updated} producto${result.data.updated === 1 ? "" : "s"}`,
        );
        handleOpenChange(false);
        onDone();
      })();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HiOutlineFolder className="size-5" />
            Cambiar categorías
          </DialogTitle>
          <DialogDescription>
            Reemplaza las categorías de {selectedCount} producto
            {selectedCount === 1 ? "" : "s"} seleccionado
            {selectedCount === 1 ? "" : "s"}. Deja vacío para quitar todas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Label>Categorías</Label>
            {categoryIds.length > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isPending}
                onClick={() => setCategoryIds([])}
              >
                Quitar selección
              </Button>
            ) : null}
          </div>

          <CategoryCombobox
            multiple
            categories={categories}
            value={categoryIds}
            onChange={setCategoryIds}
            disabled={isPending}
            placeholder="Buscar o seleccionar categorías…"
          />

          <p className="text-xs text-muted-foreground">
            {categoryIds.length === 0
              ? "Sin categorías → se limpiarán en los productos."
              : `Se asignará${selectedNames.length === 1 ? "" : "n"}: ${selectedNames.join(", ")}.`}
          </p>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => handleOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={isPending || selectedCount === 0}
            onClick={handleSubmit}
          >
            {isPending
              ? "Guardando…"
              : categoryIds.length === 0
                ? "Quitar categorías"
                : "Aplicar categorías"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
