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
  importKinguinProductsBulkAction,
  priceKinguinProductsAction,
  translateKinguinProductsAction,
} from "@/lib/actions/kinguin";
import {
  DEFAULT_MARKUP_MAX_PCT,
  DEFAULT_MARKUP_MIN_PCT,
} from "@/lib/smm-services/constants";
import type { CategoryOptionDto } from "@/types/products";
import type { KinguinSearchHitDto } from "@/types/kinguin-admin";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

type BulkImportKinguinDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hits: KinguinSearchHitDto[];
  categories: CategoryOptionDto[];
  onImported?: () => void;
};

type DraftRow = {
  kinguinId: number;
  originalName: string;
  name: string;
  description: string;
  activationDetails: string;
  regionalLimitations: string;
  markupPct: string;
  price: string;
  sourceCostPrice: string;
  priceEur: number | null;
};

export function BulkImportKinguinDialog({
  open,
  onOpenChange,
  hits,
  categories,
  onImported,
}: BulkImportKinguinDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [minMarkupPct, setMinMarkupPct] = useState(
    String(DEFAULT_MARKUP_MIN_PCT),
  );
  const [maxMarkupPct, setMaxMarkupPct] = useState(
    String(DEFAULT_MARKUP_MAX_PCT),
  );
  const [categoryId, setCategoryId] = useState("");
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [eurClpHint, setEurClpHint] = useState<number | null>(null);

  function applyPrices(
    nextHits: KinguinSearchHitDto[],
    minMarkup: string,
    maxMarkup: string,
  ) {
    startTransition(() => {
      void (async () => {
        const result = await priceKinguinProductsAction({
          items: nextHits.map((hit) => ({
            kinguinId: hit.kinguinId,
            name: hit.name,
            priceEur: hit.priceEur,
          })),
          minMarkupPct: minMarkup,
          maxMarkupPct: maxMarkup,
        });
        if (!result.success) {
          toast.error(result.message);
          return;
        }
        const byId = new Map(
          result.data.items.map((item) => [item.kinguinId, item]),
        );
        setRows((prev) =>
          prev.map((row) => {
            const priced = byId.get(row.kinguinId);
            if (!priced) return row;
            return {
              ...row,
              markupPct: String(priced.markupPct),
              price: String(priced.priceClp),
              sourceCostPrice: String(priced.costClp),
            };
          }),
        );
        setEurClpHint(result.data.eurClpRate);
      })();
    });
  }

  useEffect(() => {
    if (!open) return;
    setTimeout(() => {
      setRows(
        hits.map((hit) => ({
          kinguinId: hit.kinguinId,
          originalName: hit.name,
          name: hit.name,
          description: "",
          activationDetails: "",
          regionalLimitations: "",
          markupPct: "",
          price: "0",
          sourceCostPrice: "0",
          priceEur: hit.priceEur,
        })),
      );
      setEurClpHint(null);
      setCategoryId("");
      setMinMarkupPct(String(DEFAULT_MARKUP_MIN_PCT));
      setMaxMarkupPct(String(DEFAULT_MARKUP_MAX_PCT));
      applyPrices(
        hits,
        String(DEFAULT_MARKUP_MIN_PCT),
        String(DEFAULT_MARKUP_MAX_PCT),
      );
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, hits]);

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

  function handleTranslate() {
    startTransition(() => {
      void (async () => {
        const result = await translateKinguinProductsAction({
          kinguinIds: hits.map((hit) => hit.kinguinId),
        });
        if (!result.success) {
          toast.error(result.message);
          return;
        }
        const byId = new Map(
          result.data.items.map((item) => [item.kinguinId, item]),
        );
        setRows((prev) =>
          prev.map((row) => {
            const translated = byId.get(row.kinguinId);
            if (!translated) return row;
            return {
              ...row,
              name: translated.nameEs,
              description: translated.descriptionEs,
              activationDetails: translated.activationDetailsEs,
              regionalLimitations: translated.regionalLimitationsEs,
            };
          }),
        );
        toast.success(`Traducidos ${result.data.items.length} productos`);
      })();
    });
  }

  function handleSubmit() {
    startTransition(() => {
      void (async () => {
        const result = await importKinguinProductsBulkAction({
          items: rows.map((row) => ({
            kinguinId: row.kinguinId,
            name: row.name,
            description: row.description || undefined,
            activationDetails: row.activationDetails || undefined,
            regionalLimitations: row.regionalLimitations || undefined,
            price: row.price,
            markupPct: row.markupPct ? Number(row.markupPct) : undefined,
            sourceCostPrice: row.sourceCostPrice,
          })),
          categoryIds: categoryId ? [categoryId] : [],
        });
        if (!result.success) {
          toast.error(result.message);
          return;
        }
        const { created, failed } = result.data;
        toast.success(`Creados ${created.length} productos (DRAFT)`);
        if (failed.length > 0) {
          toast.error(
            `${failed.length} fallaron: ${failed
              .slice(0, 3)
              .map((item) => `#${item.kinguinId}`)
              .join(", ")}`,
          );
        }
        onOpenChange(false);
        onImported?.();
        router.refresh();
      })();
    });
  }

  const columns: ColumnDef<DraftRow>[] = [
    {
      accessorKey: "originalName",
      header: "Original",
      cell: ({ row }) => (
        <div className="max-w-44 space-y-0.5">
          <span className="block truncate text-muted-foreground">
            {row.original.originalName}
          </span>
          <span className="block text-[11px] text-muted-foreground">
            #{row.original.kinguinId}
            {row.original.priceEur != null
              ? ` · €${row.original.priceEur.toFixed(2)}`
              : ""}
          </span>
        </div>
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
      accessorKey: "sourceCostPrice",
      header: "Costo CLP",
      cell: ({ row }) => (
        <Input
          className="w-28"
          value={row.original.sourceCostPrice}
          onChange={(event) => {
            const value = event.target.value;
            setRows((prev) =>
              prev.map((item, index) =>
                index === row.index
                  ? { ...item, sourceCostPrice: value }
                  : item,
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Importar {hits.length} productos Kinguin</DialogTitle>
          <DialogDescription>
            Markup y precios CLP se calculan por código (EUR × FX). La IA solo
            traduce textos. Status DRAFT.
            {eurClpHint != null
              ? ` EUR/CLP ≈ ${Math.round(eurClpHint)}`
              : null}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="kinguinBulkMinMarkup">Markup mín. %</Label>
              <Input
                id="kinguinBulkMinMarkup"
                type="number"
                min={0}
                value={minMarkupPct}
                onChange={(event) => setMinMarkupPct(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kinguinBulkMaxMarkup">Markup máx. %</Label>
              <Input
                id="kinguinBulkMaxMarkup"
                type="number"
                min={0}
                value={maxMarkupPct}
                onChange={(event) => setMaxMarkupPct(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kinguinBulkCategory">Categoría</Label>
              <NativeSelect
                id="kinguinBulkCategory"
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
              >
                {categoryItems.map((item) => (
                  <NativeSelectOption key={item.value || "none"} value={item.value} data-slot="native-select-option">
                    {item.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isPending || rows.length === 0}
              onClick={() => applyPrices(hits, minMarkupPct, maxMarkupPct)}
            >
              {isPending ? "Calculando…" : "Recalcular precios"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isPending || rows.length === 0}
              onClick={handleTranslate}
            >
              <HiOutlineSparkles className="size-4" />
              {isPending ? "Traduciendo…" : "Traducir"}
            </Button>
          </div>

          <DataTable
            columns={columns}
            data={rows}
            manual
            hideToolbar
            hidePagination
            tableClassName="min-w-[48rem]"
            getRowId={(row) => String(row.kinguinId)}
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
              isPending ||
              rows.some(
                (row) =>
                  !row.name.trim() ||
                  !row.price ||
                  !row.sourceCostPrice ||
                  !row.markupPct,
              )
            }
            onClick={handleSubmit}
          >
            {isPending ? "Importando..." : `Importar ${rows.length} productos`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
