"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { HiOutlineExclamation, HiOutlineSparkles } from "react-icons/hi";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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

type BusyAction = "preview" | "pricing" | "translating" | "importing" | null;

export function ImportKinguinDialog({
  open,
  onOpenChange,
  hit,
  categories,
  onImported,
}: ImportKinguinDialogProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<BusyAction>(null);
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

  const anyBusy = busy != null;

  useEffect(() => {
    if (!open || !hit) {
      setPreview(null);
      setBusy(null);
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

    const toastId = toast.loading("Cargando producto…");
    setBusy("preview");

    void (async () => {
      try {
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
          toast.error(previewResult.message, { id: toastId });
          return;
        }
        setPreview(previewResult.data.preview);
        setDescription(previewResult.data.preview.description ?? "");
        setActivationDetails(
          previewResult.data.preview.activationDetails ?? "",
        );
        setRegionalLimitations(
          previewResult.data.preview.regionalLimitations ?? "",
        );

        if (!priceResult.success) {
          toast.error(priceResult.message, { id: toastId });
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
        toast.success("Producto listo para editar", { id: toastId });
      } finally {
        setBusy(null);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, hit?.kinguinId]);

  function handleRecalculatePrices() {
    if (!hit || anyBusy) return;
    const toastId = toast.loading("Calculando precios…");
    setBusy("pricing");
    void (async () => {
      try {
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
          toast.error(result.message, { id: toastId });
          return;
        }
        const priced = result.data.items[0];
        if (!priced) {
          toast.error("Sin precios calculados", { id: toastId });
          return;
        }
        setMarkupPct(String(priced.markupPct));
        setSourceCostPrice(String(priced.costClp));
        setPrice(String(priced.priceClp));
        setEurClpRate(result.data.eurClpRate);
        toast.success("Precios actualizados", { id: toastId });
      } finally {
        setBusy(null);
      }
    })();
  }

  function handleTranslate() {
    if (!hit || anyBusy) return;
    const toastId = toast.loading("Traduciendo…");
    setBusy("translating");
    void (async () => {
      try {
        const result = await translateKinguinProductsAction({
          kinguinIds: [hit.kinguinId],
        });
        if (!result.success) {
          toast.error(result.message, { id: toastId });
          return;
        }
        const item = result.data.items[0];
        if (!item) {
          toast.error("Sin resultado de traducción", { id: toastId });
          return;
        }
        setName(item.nameEs);
        setDescription(item.descriptionEs);
        setActivationDetails(item.activationDetailsEs);
        setRegionalLimitations(item.regionalLimitationsEs);
        toast.success("Traducción lista (nombre, descripción y metadatos)", {
          id: toastId,
        });
      } finally {
        setBusy(null);
      }
    })();
  }

  function handleImport() {
    if (!hit || anyBusy) return;
    const toastId = toast.loading("Importando producto…");
    setBusy("importing");
    void (async () => {
      try {
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
          toast.error(result.message, { id: toastId });
          return;
        }
        toast.success("Producto importado (DRAFT)", { id: toastId });
        onOpenChange(false);
        onImported?.();
        router.push(`/admin/products/${result.data.productId}`);
        router.refresh();
      } finally {
        setBusy(null);
      }
    })();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar desde Kinguin</DialogTitle>
          <DialogDescription>
            {hit?.name ?? "Producto"} · markup y precios CLP por código; la IA
            traduce nombre, descripción, activación y limitaciones regionales.
            Se crean todas las ofertas (la más barata es default).
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {(preview && !preview.chileCompatible && preview.chileWarning) ||
          (hit && !hit.chileCompatible && hit.chileWarning) ? (
            <Alert variant="destructive">
              <HiOutlineExclamation />
              <AlertTitle>No compatible con Chile</AlertTitle>
              <AlertDescription>
                {preview?.chileWarning ?? hit?.chileWarning}. Solo acepta
                productos activables en Chile.
              </AlertDescription>
            </Alert>
          ) : null}

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
              disabled={anyBusy || !hit || undefined}
              onClick={handleRecalculatePrices}
            >
              {busy === "pricing" ? "Calculando…" : "Recalcular precios"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={anyBusy || !hit || undefined}
              onClick={handleTranslate}
            >
              <HiOutlineSparkles className="size-4" />
              {busy === "translating" ? "Traduciendo…" : "Traducir"}
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
            <CategoryCombobox
              multiple
              categories={categories}
              value={categoryIds}
              onChange={setCategoryIds}
              disabled={anyBusy}
              placeholder="Buscar o seleccionar categorías…"
            />
          </div>

          <div className="space-y-2">
            <Label>Ofertas ({preview?.offers.length ?? "…"})</Label>
            <div className="max-h-48 overflow-y-auto rounded-xl border border-border">
              {(preview?.offers ?? []).length === 0 ? (
                <Empty className="rounded-none border-0 p-6">
                  <EmptyHeader>
                    <EmptyDescription>
                      {busy === "preview" ? "Cargando ofertas…" : "Sin ofertas"}
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
            disabled={anyBusy || undefined}
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={
              anyBusy ||
              !hit ||
              preview?.alreadyImported ||
              !name.trim() ||
              !price ||
              !sourceCostPrice ||
              undefined
            }
            onClick={handleImport}
          >
            {busy === "importing" ? "Importando…" : "Importar producto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
