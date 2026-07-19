"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  getKinguinProductPreviewAction,
  importKinguinProductAction,
} from "@/lib/actions/kinguin";
import { DEFAULT_KINGUIN_MARKUP_PCT } from "@/lib/smm-services/constants";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CategoryOptionDto } from "@/types/products";
import type {
  KinguinProductPreviewDto,
  KinguinSearchHitDto,
} from "@/types/kinguin-admin";

type ImportKinguinDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hit: KinguinSearchHitDto | null;
  categories: CategoryOptionDto[];
};

export function ImportKinguinDialog({
  open,
  onOpenChange,
  hit,
  categories,
}: ImportKinguinDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [markupPct, setMarkupPct] = useState(String(DEFAULT_KINGUIN_MARKUP_PCT));
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [preview, setPreview] = useState<KinguinProductPreviewDto | null>(null);
  const [eurClpRate, setEurClpRate] = useState<number | null>(null);
  const [suggestedPriceClp, setSuggestedPriceClp] = useState<number | null>(
    null,
  );

  useEffect(() => {
    if (!open || !hit) {
      setPreview(null);
      return;
    }

    const markup = Number.parseFloat(markupPct) || DEFAULT_KINGUIN_MARKUP_PCT;
    startTransition(() => {
      void (async () => {
        const result = await getKinguinProductPreviewAction({
          kinguinId: hit.kinguinId,
          markupPct: markup,
        });
        if (!result.success) {
          toast.error(result.message);
          return;
        }
        setPreview(result.data.preview);
        setEurClpRate(result.data.eurClpRate);
        setSuggestedPriceClp(result.data.suggestedPriceClp);
      })();
    });
    // Only reload preview when dialog opens / hit changes — not on every markup keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, hit?.kinguinId]);

  function toggleCategory(categoryId: string) {
    setCategoryIds((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId],
    );
  }

  function handleImport() {
    if (!hit) return;
    startTransition(() => {
      void (async () => {
        const result = await importKinguinProductAction({
          kinguinId: hit.kinguinId,
          markupPct: Number.parseFloat(markupPct) || DEFAULT_KINGUIN_MARKUP_PCT,
          categoryIds,
        });
        if (!result.success) {
          toast.error(result.message);
          return;
        }
        toast.success("Producto importado (DRAFT)");
        onOpenChange(false);
        router.push(`/admin/products/${result.data.productId}`);
        router.refresh();
      })();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar desde Kinguin</DialogTitle>
          <DialogDescription>
            {hit?.name ?? "Producto"} · se crearán todas las ofertas; la más
            barata queda como default.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="markupPct">Markup %</Label>
            <Input
              id="markupPct"
              inputMode="decimal"
              value={markupPct}
              onChange={(event) => setMarkupPct(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Precio CLP ≈ EUR × FX × (1 + markup/100)
              {eurClpRate != null
                ? ` · EUR/CLP ≈ ${Math.round(eurClpRate)}`
                : null}
              {suggestedPriceClp != null
                ? ` · sugerido $${suggestedPriceClp.toLocaleString("es-CL")}`
                : null}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Categorías</Label>
            <div className="flex flex-wrap gap-1.5">
              {categories.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sin categorías</p>
              ) : (
                categories.map((category) => {
                  const selected = categoryIds.includes(category.id);
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => toggleCategory(category.id)}
                      className={
                        selected
                          ? "rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
                          : "rounded-full border border-border bg-background px-3 py-1 text-xs font-medium hover:bg-muted"
                      }
                    >
                      {category.name}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Ofertas ({preview?.offers.length ?? "…"})</Label>
            <div className="max-h-48 overflow-y-auto rounded-xl border border-border">
              {(preview?.offers ?? []).length === 0 ? (
                <Empty className="rounded-none border-0 p-6">
                  <EmptyHeader>
                    <EmptyDescription>
                      {isPending ? "Cargando ofertas…" : "Sin ofertas"}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <ul className="divide-y divide-border text-sm">
                  {preview?.offers.map((offer) => (
                    <li
                      key={offer.offerId}
                      className="flex items-center justify-between gap-2 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate">
                          {offer.merchantName ?? offer.name ?? offer.offerId}
                          {offer.isCheapest ? (
                            <span className="ml-1 text-xs text-primary">
                              (default)
                            </span>
                          ) : null}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          qty {Math.max(offer.availableQty ?? 0, offer.qty)}
                        </p>
                      </div>
                      <span className="shrink-0 tabular-nums">
                        €{offer.priceEur.toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={isPending || !hit || preview?.alreadyImported}
            onClick={handleImport}
          >
            {isPending ? "Importando…" : "Importar producto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
