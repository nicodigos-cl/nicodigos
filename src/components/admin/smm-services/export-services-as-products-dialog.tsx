"use client";

import { useEffect, useState, useTransition } from "react";
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
import { exportSmmServicesAsProductsAction } from "@/lib/actions/smm-service-products";
import {
  DEFAULT_MARKUP_MAX_PCT,
  DEFAULT_MARKUP_MIN_PCT,
} from "@/lib/smm-services/constants";
import type { ImportProductItem } from "@/lib/validations/product-import";
import type { CategoryOptionDto } from "@/types/products";
import type { SmmServiceListItemDto } from "@/types/smm-provider";

type ExportServicesAsProductsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  services: SmmServiceListItemDto[];
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
  anchor.download = `products-from-smm-${stamp}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ExportServicesAsProductsDialog({
  open,
  onOpenChange,
  services,
  categories,
}: ExportServicesAsProductsDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [minMarkupPct, setMinMarkupPct] = useState(
    String(DEFAULT_MARKUP_MIN_PCT),
  );
  const [maxMarkupPct, setMaxMarkupPct] = useState(
    String(DEFAULT_MARKUP_MAX_PCT),
  );
  const [categoryIds, setCategoryIds] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setTimeout(() => {
      setMinMarkupPct(String(DEFAULT_MARKUP_MIN_PCT));
      setMaxMarkupPct(String(DEFAULT_MARKUP_MAX_PCT));
      setCategoryIds([]);
    }, 0);
  }, [open]);

  function handleExport() {
    startTransition(() => {
      void (async () => {
        const result = await exportSmmServicesAsProductsAction({
          serviceIds: services.map((service) => service.id),
          minMarkupPct,
          maxMarkupPct,
        });
        if (!result.success) {
          toast.error(result.message);
          return;
        }
        downloadProductsJson(result.data.items, categoryIds);
        toast.success(
          `Exportados ${result.data.items.length} productos (USD/CLP ≈ ${Math.round(result.data.usdClpRate)})`,
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
            aleatorio entre mín/máx; precio CLP desde rate USD. Las categorías se
            aplican a todos.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <p className="text-sm text-muted-foreground">
            {services.length} servicio
            {services.length === 1 ? "" : "s"} seleccionados
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="exportMinMarkup">Markup mín. %</Label>
              <Input
                id="exportMinMarkup"
                type="number"
                min={0}
                value={minMarkupPct}
                onChange={(event) => setMinMarkupPct(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exportMaxMarkup">Markup máx. %</Label>
              <Input
                id="exportMaxMarkup"
                type="number"
                min={0}
                value={maxMarkupPct}
                onChange={(event) => setMaxMarkupPct(event.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="exportCategory">Categorías</Label>
            <CategoryCombobox
              id="exportCategory"
              multiple
              categories={categories}
              value={categoryIds}
              onChange={setCategoryIds}
              disabled={isPending}
              placeholder="Buscar o seleccionar categorías…"
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
            disabled={isPending || services.length === 0}
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
