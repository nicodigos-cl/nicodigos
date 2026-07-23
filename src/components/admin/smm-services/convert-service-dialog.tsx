"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HiOutlineSparkles } from "react-icons/hi";
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
import { Textarea } from "@/components/ui/textarea";
import {
  convertSmmServicesToProductsAction,
  prefillSmmServicesWithAiAction,
} from "@/lib/actions/smm-service-products";
import { slugify } from "@/lib/products/format";
import {
  DEFAULT_MARKUP_MAX_PCT,
  DEFAULT_MARKUP_MIN_PCT,
} from "@/lib/smm-services/constants";
import type { CategoryOptionDto } from "@/types/products";
import type { SmmServiceListItemDto } from "@/types/smm-provider";

type ConvertServiceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: SmmServiceListItemDto | null;
  categories: CategoryOptionDto[];
};

export function ConvertServiceDialog({
  open,
  onOpenChange,
  service,
  categories,
}: ConvertServiceDialogProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<"prefill" | "creating" | null>(null);
  const [minMarkupPct, setMinMarkupPct] = useState(
    String(DEFAULT_MARKUP_MIN_PCT),
  );
  const [maxMarkupPct, setMaxMarkupPct] = useState(
    String(DEFAULT_MARKUP_MAX_PCT),
  );
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("0");
  const [markupPct, setMarkupPct] = useState("");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const anyBusy = busy != null;

  function resetFromService(next: SmmServiceListItemDto | null) {
    if (!next) return;
    setName(next.name);
    setSlug(slugify(next.name));
    setSlugTouched(false);
    setDescription("");
    setPrice("0");
    setMarkupPct("");
    setCategoryIds([]);
    setMinMarkupPct(String(DEFAULT_MARKUP_MIN_PCT));
    setMaxMarkupPct(String(DEFAULT_MARKUP_MAX_PCT));
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen && service) {
      resetFromService(service);
    }
    onOpenChange(nextOpen);
  }

  function handlePrefill() {
    if (!service || anyBusy) return;
    const toastId = toast.loading("Traduciendo y calculando precios…");
    setBusy("prefill");
    void (async () => {
      try {
        const result = await prefillSmmServicesWithAiAction({
          serviceIds: [service.id],
          minMarkupPct,
          maxMarkupPct,
        });
        if (!result.success) {
          toast.error(result.message, { id: toastId });
          return;
        }
        const item = result.data.items[0];
        if (!item) {
          toast.error("Sin resultado de IA", { id: toastId });
          return;
        }
        setName(item.nameEs);
        if (!slugTouched) {
          setSlug(slugify(item.nameEs));
        }
        setDescription(item.descriptionEs);
        setPrice(String(item.priceClp));
        setMarkupPct(String(item.markupPct));
        toast.success(
          `Prefill listo (USD/CLP ≈ ${Math.round(result.data.usdClpRate)})`,
          { id: toastId },
        );
      } finally {
        setBusy(null);
      }
    })();
  }

  function handleSubmit() {
    if (!service || anyBusy) return;
    const toastId = toast.loading("Creando producto…");
    setBusy("creating");
    void (async () => {
      try {
        const result = await convertSmmServicesToProductsAction({
          items: [
            {
              serviceId: service.id,
              name,
              slug,
              description,
              price,
              markupPct: markupPct ? Number(markupPct) : undefined,
            },
          ],
          categoryIds,
        });
        if (!result.success) {
          toast.error(result.message, { id: toastId });
          return;
        }
        toast.success("Producto creado en borrador", { id: toastId });
        onOpenChange(false);
        router.refresh();
      } finally {
        setBusy(null);
      }
    })();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Convertir a producto</DialogTitle>
          <DialogDescription>
            {service
              ? `Servicio #${service.remoteServiceId} · rate USD ${service.rate}`
              : "Selecciona un servicio"}
          </DialogDescription>
        </DialogHeader>

        {service ? (
          <div className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Tipo:</span>{" "}
              {service.type}
              {" · "}
              <span className="font-medium text-foreground">
                Categoría:
              </span>{" "}
              {service.category}
            </p>
            <p className="mt-1">
              <span className="font-medium text-foreground">Cantidad:</span>{" "}
              {service.min.toLocaleString("es-CL")} –{" "}
              {service.max.toLocaleString("es-CL")}
              {" · "}
              Refill: {service.refill ? "sí" : "no"}
              {" · "}
              Cancel: {service.cancel ? "sí" : "no"}
            </p>
            <p className="mt-1">
              Stock ilimitado. El pedido se limita con min/max del servicio.
              Costo CLP se calcula desde rate USD.
            </p>
          </div>
        ) : null}

        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="minMarkup">Markup mín. %</Label>
              <Input
                id="minMarkup"
                type="number"
                min={0}
                value={minMarkupPct}
                onChange={(event) => setMinMarkupPct(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxMarkup">Markup máx. %</Label>
              <Input
                id="maxMarkup"
                type="number"
                min={0}
                value={maxMarkupPct}
                onChange={(event) => setMaxMarkupPct(event.target.value)}
              />
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            disabled={anyBusy || !service || undefined}
            onClick={handlePrefill}
          >
            <HiOutlineSparkles className="size-4" />
            {busy === "prefill" ? "Generando..." : "Traducir / prellenar con IA"}
          </Button>

          <div className="space-y-2">
            <Label htmlFor="productName">Nombre</Label>
            <Input
              id="productName"
              value={name}
              onChange={(event) => {
                const value = event.target.value;
                setName(value);
                if (!slugTouched) setSlug(slugify(value));
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="productSlug">Slug</Label>
            <Input
              id="productSlug"
              value={slug}
              onChange={(event) => {
                setSlugTouched(true);
                setSlug(event.target.value);
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="productDescription">Descripción</Label>
            <Textarea
              id="productDescription"
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="productPrice">Precio CLP</Label>
              <Input
                id="productPrice"
                inputMode="decimal"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="appliedMarkup">Markup aplicado %</Label>
              <Input
                id="appliedMarkup"
                value={markupPct}
                onChange={(event) => setMarkupPct(event.target.value)}
                placeholder="—"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Categorías (opcional)</Label>
            <CategoryCombobox
              multiple
              categories={categories}
              value={categoryIds}
              onChange={setCategoryIds}
              disabled={anyBusy}
              placeholder="Buscar o seleccionar categorías…"
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Estado: DRAFT · Entrega: SMM · Moneda: CLP
          </p>
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
            disabled={anyBusy || !name.trim() || !price || undefined}
            onClick={handleSubmit}
          >
            {busy === "creating" ? "Creando..." : "Crear producto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
