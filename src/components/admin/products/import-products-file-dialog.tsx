"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import { CategoryCombobox } from "@/components/admin/category-combobox";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { importProductsAction } from "@/lib/actions/product-import";
import {
  parseProductsCsv,
  parseProductsJson,
} from "@/lib/products/parse-import";
import { PRODUCT_IMPORT_LIMIT } from "@/lib/validations/product-import";
import type { ImportProductItem } from "@/lib/validations/product-import";
import type { CategoryOptionDto } from "@/types/products";

type ImportMode = "json" | "csv";

type ImportProductsFileDialogProps = {
  open: boolean;
  mode: ImportMode;
  onOpenChange: (open: boolean) => void;
  categories: CategoryOptionDto[];
};

export function ImportProductsFileDialog({
  open,
  mode,
  onOpenChange,
  categories,
}: ImportProductsFileDialogProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [items, setItems] = useState<ImportProductItem[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState("");

  function reset() {
    setItems([]);
    setFileName(null);
    setCategoryId("");
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      reset();
    }
    onOpenChange(next);
  }

  function handleFile(file: File | null) {
    if (!file) return;

    void file.text().then((text) => {
      const parsed =
        mode === "csv" ? parseProductsCsv(text) : parseProductsJson(text);

      if (!parsed.success) {
        toast.error(parsed.message);
        reset();
        return;
      }

      for (const warning of parsed.warnings) {
        toast.message(warning);
      }

      setFileName(file.name);
      setItems(parsed.items);
      if (parsed.categoryIds && parsed.categoryIds.length > 0) {
        const first = parsed.categoryIds[0] ?? "";
        const known = categories.some((category) => category.id === first);
        setCategoryId(known ? first : "");
      } else {
        setCategoryId("");
      }
      toast.success(`${parsed.items.length} producto(s) listos para importar`);
    });
  }

  function handleSubmit() {
    if (items.length === 0) return;

    startTransition(() => {
      void (async () => {
        const result = await importProductsAction({
          items,
          categoryIds: categoryId ? [categoryId] : [],
        });
        if (!result.success) {
          toast.error(result.message);
          return;
        }
        toast.success(`Importados ${result.data.count} productos`);
        handleOpenChange(false);
        router.refresh();
      })();
    });
  }

  const accept = mode === "csv" ? ".csv,text/csv" : "application/json,.json";
  const title =
    mode === "csv" ? "Importar productos (CSV)" : "Importar productos (JSON)";
  const previewColumns: ColumnDef<ImportProductItem>[] = [
    {
      accessorKey: "name",
      header: "Nombre",
      cell: ({ row }) => (
        <span className="block max-w-48 truncate">{row.original.name}</span>
      ),
    },
    {
      accessorKey: "price",
      header: "Precio",
      cell: ({ row }) => (
        <span className="tabular-nums">
          {row.original.price} {row.original.currency}
        </span>
      ),
    },
    { accessorKey: "deliveryMethod", header: "Entrega" },
    { accessorKey: "status", header: "Estado" },
  ];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Máximo {PRODUCT_IMPORT_LIMIT} productos. Campos mínimos: name y
            price. Status por defecto DRAFT · moneda CLP.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="product-import-file">Archivo</Label>
            <input
              ref={inputRef}
              id="product-import-file"
              type="file"
              accept={accept}
              className="block w-full text-sm file:mr-3 file:rounded-2xl file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium"
              onChange={(event) => {
                handleFile(event.target.files?.[0] ?? null);
              }}
            />
            {fileName ? (
              <p className="text-xs text-muted-foreground">{fileName}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="product-import-category">
              Categoría (opcional)
            </Label>
            <CategoryCombobox
              id="product-import-category"
              categories={categories}
              value={categoryId}
              onChange={setCategoryId}
              disabled={isPending}
              placeholder="Buscar categoría…"
            />
          </div>

          {items.length > 0 ? (
            <div>
              <DataTable
                columns={previewColumns}
                data={items.slice(0, 12)}
                manual
                hideToolbar
                hidePagination
                tableClassName="min-w-[28rem]"
                getRowId={(item, index) => `${item.name}-${index}`}
              />
              {items.length > 12 ? (
                <p className="mt-2 px-3 text-xs text-muted-foreground">
                  … y {items.length - 12} más
                </p>
              ) : null}
            </div>
          ) : null}
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
            disabled={isPending || items.length === 0}
            onClick={handleSubmit}
          >
            {isPending
              ? "Importando..."
              : `Importar ${items.length || ""} producto${items.length === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
