"use client";

import { useDeferredValue, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import {
  HiOutlineCheckCircle,
  HiOutlineClipboard,
  HiOutlineExclamationCircle,
  HiOutlineTemplate,
  HiOutlineTrash,
} from "react-icons/hi";
import { toast } from "sonner";

import { CategoryCombobox } from "@/components/admin/category-combobox";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { importProductsAction } from "@/lib/actions/product-import";
import { parseProductsJson } from "@/lib/products/parse-import";
import { cn } from "@/lib/utils";
import {
  PRODUCT_IMPORT_LIMIT,
  type ImportProductItem,
} from "@/lib/validations/product-import";
import type { CategoryOptionDto } from "@/types/products";

const EXAMPLE_JSON = `{
  "items": [
    {
      "name": "Producto de ejemplo",
      "price": "9990",
      "description": "Descripción opcional en español.",
      "deliveryMethod": "MANUAL",
      "status": "DRAFT",
      "currency": "CLP"
    }
  ]
}`;

type ParseState =
  | { status: "empty" }
  | { status: "invalid"; message: string }
  | {
      status: "valid";
      items: ImportProductItem[];
      warnings: string[];
      categoryIds?: string[];
    };

type ImportProductsPasteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategoryOptionDto[];
};

function parseEditorText(text: string): ParseState {
  const trimmed = text.trim();
  if (!trimmed) return { status: "empty" };

  const parsed = parseProductsJson(trimmed);
  if (!parsed.success) {
    return { status: "invalid", message: parsed.message };
  }

  return {
    status: "valid",
    items: parsed.items,
    warnings: parsed.warnings,
    categoryIds: parsed.categoryIds,
  };
}

export function ImportProductsPasteDialog({
  open,
  onOpenChange,
  categories,
}: ImportProductsPasteDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [raw, setRaw] = useState(EXAMPLE_JSON);
  const [categoryId, setCategoryId] = useState("");
  const deferredRaw = useDeferredValue(raw);
  const parseState = useMemo(
    () => parseEditorText(deferredRaw),
    [deferredRaw],
  );

  const previewColumns: ColumnDef<ImportProductItem>[] = [
    {
      accessorKey: "name",
      header: "Nombre",
      cell: ({ row }) => (
        <span className="block max-w-52 truncate font-medium">
          {row.original.name}
        </span>
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

  function applyCategoryFromParse(state: ParseState) {
    if (state.status !== "valid" || !state.categoryIds?.length) return;
    const first = state.categoryIds[0] ?? "";
    const known = categories.some((category) => category.id === first);
    setCategoryId(known ? first : "");
  }

  function reset() {
    setRaw(EXAMPLE_JSON);
    setCategoryId("");
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        toast.message("El portapapeles está vacío");
        return;
      }
      setRaw(text);
      applyCategoryFromParse(parseEditorText(text));
      toast.success("JSON pegado desde el portapapeles");
    } catch {
      toast.error("No se pudo leer el portapapeles");
    }
  }

  function handleFormat() {
    try {
      const parsed = JSON.parse(raw) as unknown;
      const formatted = JSON.stringify(parsed, null, 2);
      setRaw(formatted);
      applyCategoryFromParse(parseEditorText(formatted));
      toast.success("JSON formateado");
    } catch {
      toast.error("No se puede formatear: JSON inválido");
    }
  }

  function handleSubmit() {
    const current = parseEditorText(raw);
    if (current.status !== "valid") {
      toast.error(
        current.status === "invalid"
          ? current.message
          : "Pega un JSON con productos primero",
      );
      return;
    }

    for (const warning of current.warnings) {
      toast.message(warning);
    }

    startTransition(() => {
      void (async () => {
        const result = await importProductsAction({
          items: current.items,
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

  const validCount =
    parseState.status === "valid" ? parseState.items.length : 0;
  const canImport = parseState.status === "valid" && validCount > 0 && !isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-full flex-col gap-5 overflow-hidden sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Pegar productos (JSON)</DialogTitle>
          <DialogDescription>
            Pega un array o un objeto{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
              {"{ items: [...] }"}
            </code>
            . Máximo {PRODUCT_IMPORT_LIMIT} · mínimos:{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
              name
            </code>
            ,{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
              price
            </code>
            .
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-0.5">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => void handlePaste()}
            >
              <HiOutlineClipboard className="size-4" />
              Pegar
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={handleFormat}
            >
              Formatear
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => setRaw(EXAMPLE_JSON)}
            >
              <HiOutlineTemplate className="size-4" />
              Ejemplo
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isPending}
              onClick={() => setRaw("")}
            >
              <HiOutlineTrash className="size-4" />
              Limpiar
            </Button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="product-paste-json">Editor JSON</Label>
              {parseState.status === "valid" ? (
                <Badge variant="secondary" className="gap-1">
                  <HiOutlineCheckCircle className="size-3.5 text-emerald-600" />
                  {validCount} válido
                  {validCount === 1 ? "" : "s"}
                </Badge>
              ) : parseState.status === "invalid" ? (
                <Badge variant="destructive" className="gap-1">
                  <HiOutlineExclamationCircle className="size-3.5" />
                  Inválido
                </Badge>
              ) : (
                <Badge variant="outline">Vacío</Badge>
              )}
            </div>

            <div
              className={cn(
                "overflow-hidden rounded-2xl border bg-muted/30 ring-1 ring-border/60 transition-[box-shadow,border-color]",
                parseState.status === "invalid" &&
                  "border-destructive/50 ring-destructive/20",
                parseState.status === "valid" &&
                  "border-emerald-500/30 ring-emerald-500/15",
              )}
            >
              <div className="flex items-center justify-between border-b border-border/70 bg-muted/50 px-3 py-1.5">
                <span className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
                  JSON
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {raw.length.toLocaleString("es-CL")} caracteres
                </span>
              </div>
              <Textarea
                id="product-paste-json"
                value={raw}
                spellCheck={false}
                disabled={isPending}
                onChange={(event) => setRaw(event.target.value)}
                className="min-h-[280px] resize-y rounded-none border-0 bg-transparent px-4 py-3 font-mono text-[12.5px] leading-relaxed shadow-none focus-visible:ring-0 md:min-h-[320px] md:text-[12.5px]"
                placeholder='{ "items": [ { "name": "...", "price": "9990" } ] }'
              />
            </div>

            {parseState.status === "invalid" ? (
              <p className="text-xs text-destructive">{parseState.message}</p>
            ) : parseState.status === "valid" &&
              parseState.warnings.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                {parseState.warnings[0]}
                {parseState.warnings.length > 1
                  ? ` (+${parseState.warnings.length - 1} avisos)`
                  : null}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Compatible con el JSON exportado desde la barra de acciones.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="product-paste-category">Categoría (opcional)</Label>
            <CategoryCombobox
              id="product-paste-category"
              categories={categories}
              value={categoryId}
              onChange={setCategoryId}
              disabled={isPending}
              placeholder="Buscar categoría…"
            />
          </div>

          {parseState.status === "valid" ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Vista previa</p>
                <p className="text-xs text-muted-foreground">
                  Mostrando {Math.min(validCount, 12)} de {validCount}
                </p>
              </div>
              <div className="overflow-hidden rounded-2xl border border-border/80">
                <DataTable
                  columns={previewColumns}
                  data={parseState.items.slice(0, 12)}
                  manual
                  hideToolbar
                  hidePagination
                  tableClassName="min-w-[28rem]"
                  getRowId={(item, index) => `${item.name}-${index}`}
                />
              </div>
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
          <Button type="button" disabled={!canImport} onClick={handleSubmit}>
            {isPending
              ? "Importando…"
              : `Importar ${validCount || ""} producto${validCount === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
