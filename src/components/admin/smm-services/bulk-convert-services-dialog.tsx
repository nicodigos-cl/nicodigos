"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { HiOutlineSparkles } from "react-icons/hi";
import { toast } from "sonner";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  convertSmmServicesToProductsAction,
  prefillSmmServicesWithAiAction,
  type PrefillServiceItem,
} from "@/lib/actions/smm-service-products";
import {
  DEFAULT_MARKUP_MAX_PCT,
  DEFAULT_MARKUP_MIN_PCT,
} from "@/lib/smm-services/constants";
import type { CategoryOptionDto } from "@/types/products";
import type { SmmServiceListItemDto } from "@/types/smm-provider";

type BulkConvertServicesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  services: SmmServiceListItemDto[];
  categories: CategoryOptionDto[];
};

type DraftRow = {
  serviceId: string;
  originalName: string;
  name: string;
  description: string;
  markupPct: string;
  price: string;
};

export function BulkConvertServicesDialog({
  open,
  onOpenChange,
  services,
  categories,
}: BulkConvertServicesDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [minMarkupPct, setMinMarkupPct] = useState(
    String(DEFAULT_MARKUP_MIN_PCT),
  );
  const [maxMarkupPct, setMaxMarkupPct] = useState(
    String(DEFAULT_MARKUP_MAX_PCT),
  );
  const [categoryId, setCategoryId] = useState<string>("");
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [usdClpHint, setUsdClpHint] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setRows(
      services.map((service) => ({
        serviceId: service.id,
        originalName: service.name,
        name: service.name,
        description: "",
        markupPct: "",
        price: "0",
      })),
    );
    setUsdClpHint(null);
    setCategoryId("");
    setMinMarkupPct(String(DEFAULT_MARKUP_MIN_PCT));
    setMaxMarkupPct(String(DEFAULT_MARKUP_MAX_PCT));
  }, [open, services]);

  const categoryItems = useMemo(
    () => [
      { value: "", label: "Sin categoría" },
      ...categories.map((category) => ({
        value: category.id,
        label: category.name,
      })),
    ],
    [categories],
  );

  function applyPrefill(items: PrefillServiceItem[]) {
    const byId = new Map(items.map((item) => [item.serviceId, item]));
    setRows((prev) =>
      prev.map((row) => {
        const item = byId.get(row.serviceId);
        if (!item) return row;
        return {
          ...row,
          name: item.nameEs,
          description: item.descriptionEs,
          markupPct: String(item.markupPct),
          price: String(item.priceClp),
        };
      }),
    );
  }

  function handlePrefill() {
    startTransition(() => {
      void (async () => {
        const result = await prefillSmmServicesWithAiAction({
          serviceIds: services.map((service) => service.id),
          minMarkupPct,
          maxMarkupPct,
        });
        if (!result.success) {
          toast.error(result.message);
          return;
        }
        applyPrefill(result.data.items);
        setUsdClpHint(result.data.usdClpRate);
        toast.success(`Prefill de ${result.data.items.length} servicios`);
      })();
    });
  }

  function handleSubmit() {
    startTransition(() => {
      void (async () => {
        const result = await convertSmmServicesToProductsAction({
          items: rows.map((row) => ({
            serviceId: row.serviceId,
            name: row.name,
            description: row.description || undefined,
            price: row.price,
            markupPct: row.markupPct ? Number(row.markupPct) : undefined,
          })),
          categoryIds: categoryId ? [categoryId] : [],
        });
        if (!result.success) {
          toast.error(result.message);
          return;
        }
        toast.success(
          `Creados ${result.data.created.length} productos (DRAFT)`,
        );
        onOpenChange(false);
        router.refresh();
      })();
    });
  }

  const columns: ColumnDef<DraftRow>[] = [
    {
      accessorKey: "originalName",
      header: "Original",
      cell: ({ row }) => (
        <span className="block max-w-40 truncate text-muted-foreground">
          {row.original.originalName}
        </span>
      ),
    },
    {
      accessorKey: "name",
      header: "Nombre ES",
      cell: ({ row }) => (
        <Input
          value={row.original.name}
          onChange={(event) => {
            const value = event.target.value;
            setRows((prev) =>
              prev.map((item, index) =>
                index === row.index ? { ...item, name: value } : item,
              ),
            );
          }}
        />
      ),
    },
    {
      accessorKey: "markupPct",
      header: "Markup %",
      cell: ({ row }) => (
        <Input
          className="w-24"
          value={row.original.markupPct}
          onChange={(event) => {
            const value = event.target.value;
            setRows((prev) =>
              prev.map((item, index) =>
                index === row.index ? { ...item, markupPct: value } : item,
              ),
            );
          }}
        />
      ),
    },
    {
      accessorKey: "price",
      header: "Precio CLP",
      cell: ({ row }) => (
        <Input
          className="w-32"
          value={row.original.price}
          onChange={(event) => {
            const value = event.target.value;
            setRows((prev) =>
              prev.map((item, index) =>
                index === row.index ? { ...item, price: value } : item,
              ),
            );
          }}
        />
      ),
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Convertir {services.length} servicios</DialogTitle>
          <DialogDescription>
            Define markup min/máx, genera con IA y confirma. Status DRAFT · CLP.
            {usdClpHint != null ? ` USD/CLP ≈ ${Math.round(usdClpHint)}` : null}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="bulkMinMarkup">Markup mín. %</Label>
              <Input
                id="bulkMinMarkup"
                type="number"
                min={0}
                value={minMarkupPct}
                onChange={(event) => setMinMarkupPct(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bulkMaxMarkup">Markup máx. %</Label>
              <Input
                id="bulkMaxMarkup"
                type="number"
                min={0}
                value={maxMarkupPct}
                onChange={(event) => setMaxMarkupPct(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bulkCategory">Categoría</Label>
              <select
                id="bulkCategory"
                className="flex h-9 w-full rounded-2xl border border-input bg-transparent px-3 text-sm"
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
              >
                {categoryItems.map((item) => (
                  <option key={item.value || "none"} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            disabled={isPending || services.length === 0}
            onClick={handlePrefill}
          >
            <HiOutlineSparkles className="size-4" />
            {isPending ? "Generando..." : "Traducir / generar precios con IA"}
          </Button>

          <DataTable
            columns={columns}
            data={rows}
            manual
            hideToolbar
            hidePagination
            tableClassName="min-w-[40rem]"
            getRowId={(row) => row.serviceId}
          />
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
            disabled={
              isPending || rows.some((row) => !row.name.trim() || !row.price)
            }
            onClick={handleSubmit}
          >
            {isPending ? "Creando..." : `Crear ${rows.length} productos`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
