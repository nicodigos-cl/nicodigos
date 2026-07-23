"use client";

import { useMemo, useState, useTransition } from "react";
import { HiOutlineFolder } from "react-icons/hi";
import { toast } from "sonner";

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
import { cn } from "@/lib/utils";
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

  function toggleCategory(categoryId: string) {
    setCategoryIds((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId],
    );
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

          {categories.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
              No hay categorías creadas.
            </p>
          ) : (
            <div className="flex max-h-64 flex-wrap gap-2 overflow-y-auto rounded-2xl border border-border/80 bg-muted/20 p-3">
              {categories.map((category) => {
                const selected = categoryIds.includes(category.id);
                return (
                  <button
                    key={category.id}
                    type="button"
                    disabled={isPending}
                    onClick={() => toggleCategory(category.id)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                      selected
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-background text-foreground hover:bg-muted",
                    )}
                  >
                    {category.name}
                  </button>
                );
              })}
            </div>
          )}

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
