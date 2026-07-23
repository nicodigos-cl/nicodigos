"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { HiOutlineDownload } from "react-icons/hi";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { exportKinguinAsProductsAction } from "@/lib/actions/kinguin";
import {
  DEFAULT_MARKUP_MAX_PCT,
  DEFAULT_MARKUP_MIN_PCT,
} from "@/lib/smm-services/constants";
import type { ImportProductItem } from "@/lib/validations/product-import";
import type { CategoryOptionDto } from "@/types/products";
import type { KinguinSearchHitDto } from "@/types/kinguin-admin";

type ExportKinguinAsProductsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hits: KinguinSearchHitDto[];
  categories: CategoryOptionDto[];
};

function downloadProductsJson(
  items: ImportProductItem[],
  categoryIds: string[],
) {
  const payload = { items, categoryIds };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  anchor.href = url;
  anchor.download = `products-from-kinguin-${stamp}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ExportKinguinAsProductsDialog({
  open,
  onOpenChange,
  hits,
  categories,
}: ExportKinguinAsProductsDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [minMarkupPct, setMinMarkupPct] = useState(
    String(DEFAULT_MARKUP_MIN_PCT),
  );
  const [maxMarkupPct, setMaxMarkupPct] = useState(
    String(DEFAULT_MARKUP_MAX_PCT),
  );
  const [categoryId, setCategoryId] = useState("");

  useEffect(() => {
    if (!open) return;
    setTimeout(() => {
      setMinMarkupPct(String(DEFAULT_MARKUP_MIN_PCT));
      setMaxMarkupPct(String(DEFAULT_MARKUP_MAX_PCT));
      setCategoryId("");
    }, 0);
  }, [open]);

  function handleExport() {
    startTransition(() => {
      void (async () => {
        const result = await exportKinguinAsProductsAction({
          items: hits.map((hit) => ({
            kinguinId: hit.kinguinId,
            name: hit.name,
            priceEur: hit.priceEur,
          })),
          minMarkupPct,
          maxMarkupPct,
        });
        if (!result.success) {
          toast.error(result.message);
          return;
        }
        downloadProductsJson(
          result.data.items,
          categoryId ? [categoryId] : [],
        );
        toast.success(
          `Exportados ${result.data.items.length} productos (EUR/CLP ≈ ${Math.round(result.data.eurClpRate)})`,
        );
        onOpenChange(false);
      })();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Exportar como producto</DialogTitle>
          <DialogDescription>
            Genera un JSON importable en Productos (Importar → Con JSON). Markup
            aleatorio entre mín/máx; precio CLP desde EUR × FX. La categoría se
            aplica a todos.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <p className="text-sm text-muted-foreground">
            {hits.length} producto{hits.length === 1 ? "" : "s"} seleccionado
            {hits.length === 1 ? "" : "s"}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="kinguinExportMinMarkup">Markup mín. %</Label>
              <Input
                id="kinguinExportMinMarkup"
                type="number"
                min={0}
                value={minMarkupPct}
                onChange={(event) => setMinMarkupPct(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kinguinExportMaxMarkup">Markup máx. %</Label>
              <Input
                id="kinguinExportMaxMarkup"
                type="number"
                min={0}
                value={maxMarkupPct}
                onChange={(event) => setMaxMarkupPct(event.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="kinguinExportCategory">Categoría</Label>
            <CategoryCombobox
              id="kinguinExportCategory"
              categories={categories}
              value={categoryId}
              onChange={setCategoryId}
              disabled={isPending}
              placeholder="Buscar categoría…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={isPending || hits.length === 0}
            onClick={handleExport}
          >
            <HiOutlineDownload className="size-4" />
            {isPending ? "Generando…" : "Descargar JSON"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
