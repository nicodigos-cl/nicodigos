"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HiOutlineSparkles } from "react-icons/hi";
import { toast } from "sonner";

import {
  getKinguinProductPreviewAction,
  importKinguinProductAction,
  priceKinguinProductsAction,
  translateKinguinProductsAction,
} from "@/lib/actions/kinguin";
import {
  DEFAULT_KINGUIN_MARKUP_PCT,
  DEFAULT_MARKUP_MAX_PCT,
  DEFAULT_MARKUP_MIN_PCT,
} from "@/lib/smm-services/constants";
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
import { Textarea } from "@/components/ui/textarea";
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
  onImported?: () => void;
};

export function ImportKinguinDialog({
  open,
  onOpenChange,
  hit,
  categories,
  onImported,
}: ImportKinguinDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [minMarkupPct, setMinMarkupPct] = useState(
    String(DEFAULT_MARKUP_MIN_PCT),
  );
  const [maxMarkupPct, setMaxMarkupPct] = useState(
    String(DEFAULT_MARKUP_MAX_PCT),
  );
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [activationDetails, setActivationDetails] = useState("");
  const [regionalLimitations, setRegionalLimitations] = useState("");
  const [markupPct, setMarkupPct] = useState(String(DEFAULT_KINGUIN_MARKUP_PCT));
  const [price, setPrice] = useState("");
  const [sourceCostPrice, setSourceCostPrice] = useState("");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [preview, setPreview] = useState<KinguinProductPreviewDto | null>(null);
  const [eurClpRate, setEurClpRate] = useState<number | null>(null);

  useEffect(() => {
    if (!open || !hit) {
      setPreview(null);
      return;
    }

    setName(hit.name);
    setDescription("");
    setActivationDetails("");
    setRegionalLimitations("");
    setMarkupPct(String(DEFAULT_KINGUIN_MARKUP_PCT));
    setPrice("");
    setSourceCostPrice("");
    setCategoryIds([]);
    setMinMarkupPct(String(DEFAULT_MARKUP_MIN_PCT));
    setMaxMarkupPct(String(DEFAULT_MARKUP_MAX_PCT));
    setEurClpRate(null);

    startTransition(() => {
      void (async () => {
        const [previewResult, priceResult] = await Promise.all([
          getKinguinProductPreviewAction({
            kinguinId: hit.kinguinId,
            markupPct: DEFAULT_KINGUIN_MARKUP_PCT,
          }),
          priceKinguinProductsAction({
            items: [
              {
                kinguinId: hit.kinguinId,
                name: hit.name,
                priceEur: hit.priceEur,
              },
            ],
            minMarkupPct: DEFAULT_MARKUP_MIN_PCT,
            maxMarkupPct: DEFAULT_MARKUP_MAX_PCT,
          }),
        ]);

        if (!previewResult.success) {
          toast.error(previewResult.message);
          return;
        }
        setPreview(previewResult.data.preview);
        setDescription(previewResult.data.preview.description ?? "");

        if (!priceResult.success) {
          toast.error(priceResult.message);
          setEurClpRate(previewResult.data.eurClpRate);
          if (previewResult.data.costClp != null) {
            setSourceCostPrice(String(previewResult.data.costClp));
          }
          if (previewResult.data.suggestedPriceClp != null) {
            setPrice(String(previewResult.data.suggestedPriceClp));
          }
          return;
        }

        const priced = priceResult.data.items[0];
        setEurClpRate(priceResult.data.eurClpRate);
        if (priced) {
          setMarkupPct(String(priced.markupPct));
          setSourceCostPrice(String(priced.costClp));
          setPrice(String(priced.priceClp));
        }
      })();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, hit?.kinguinId]);

  function toggleCategory(categoryId: string) {
    setCategoryIds((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId],
    );
  }

  function handleRecalculatePrices() {
    if (!hit) return;
    startTransition(() => {
      void (async () => {
        const result = await priceKinguinProductsAction({
          items: [
            {
              kinguinId: hit.kinguinId,
              name: hit.name,
              priceEur: hit.priceEur ?? preview?.priceEur ?? null,
            },
          ],
          minMarkupPct,
          maxMarkupPct,
        });
        if (!result.success) {
          toast.error(result.message);
          return;
        }
        const priced = result.data.items[0];
        if (!priced) return;
        setMarkupPct(String(priced.markupPct));
        setSourceCostPrice(String(priced.costClp));
        setPrice(String(priced.priceClp));
        setEurClpRate(result.data.eurClpRate);
      })();
    });
  }

  function handleTranslate() {
    if (!hit) return;
    startTransition(() => {
      void (async () => {
        const result = await translateKinguinProductsAction({
          kinguinIds: [hit.kinguinId],
        });
        if (!result.success) {
          toast.error(result.message);
          return;
        }
        const item = result.data.items[0];
        if (!item) {
          toast.error("Sin resultado de traducción");
          return;
        }
        setName(item.nameEs);
        setDescription(item.descriptionEs);
        setActivationDetails(item.activationDetailsEs);
        setRegionalLimitations(item.regionalLimitationsEs);
        toast.success("Traducción lista");
      })();
    });
  }

  function handleImport() {
    if (!hit) return;
    startTransition(() => {
      void (async () => {
        const result = await importKinguinProductAction({
          kinguinId: hit.kinguinId,
          markupPct: Number.parseFloat(markupPct) || DEFAULT_KINGUIN_MARKUP_PCT,
          categoryIds,
          name: name.trim() || undefined,
          description: description || undefined,
          activationDetails: activationDetails || undefined,
          regionalLimitations: regionalLimitations || undefined,
          price: price || undefined,
          sourceCostPrice: sourceCostPrice || undefined,
        });
        if (!result.success) {
          toast.error(result.message);
          return;
        }
        toast.success("Producto importado (DRAFT)");
        onOpenChange(false);
        onImported?.();
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
            {hit?.name ?? "Producto"} · markup y precios CLP por código; la IA
            solo traduce. Se crean todas las ofertas (la más barata es default).
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="kinguinMinMarkup">Markup mín. %</Label>
              <Input
                id="kinguinMinMarkup"
                type="number"
                min={0}
                value={minMarkupPct}
                onChange={(event) => setMinMarkupPct(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kinguinMaxMarkup">Markup máx. %</Label>
              <Input
                id="kinguinMaxMarkup"
                type="number"
                min={0}
                value={maxMarkupPct}
                onChange={(event) => setMaxMarkupPct(event.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isPending || !hit}
              onClick={handleRecalculatePrices}
            >
              {isPending ? "Calculando…" : "Recalcular precios"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isPending || !hit}
              onClick={handleTranslate}
            >
              <HiOutlineSparkles className="size-4" />
              {isPending ? "Traduciendo…" : "Traducir"}
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="kinguinName">Nombre</Label>
            <Input
              id="kinguinName"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="kinguinDescription">Descripción</Label>
            <Textarea
              id="kinguinDescription"
              rows={5}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="kinguinActivation">Activación</Label>
            <Textarea
              id="kinguinActivation"
              rows={2}
              value={activationDetails}
              onChange={(event) => setActivationDetails(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="kinguinRegional">Limitaciones regionales</Label>
            <Input
              id="kinguinRegional"
              value={regionalLimitations}
              onChange={(event) => setRegionalLimitations(event.target.value)}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="kinguinCostClp">Costo CLP</Label>
              <Input
                id="kinguinCostClp"
                inputMode="decimal"
                value={sourceCostPrice}
                onChange={(event) => setSourceCostPrice(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="markupPct">Markup %</Label>
              <Input
                id="markupPct"
                inputMode="decimal"
                value={markupPct}
                onChange={(event) => setMarkupPct(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kinguinPriceClp">Precio CLP</Label>
              <Input
                id="kinguinPriceClp"
                inputMode="decimal"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Precio CLP ≈ costo × (1 + markup/100)
            {eurClpRate != null
              ? ` · EUR/CLP ≈ ${Math.round(eurClpRate)}`
              : null}
          </p>

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
            disabled={
              isPending ||
              !hit ||
              preview?.alreadyImported ||
              !name.trim() ||
              !price ||
              !sourceCostPrice
            }
            onClick={handleImport}
          >
            {isPending ? "Importando…" : "Importar producto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
