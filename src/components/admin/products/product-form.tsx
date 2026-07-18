"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  HiOutlineArrowLeft,
  HiOutlineChevronDown,
  HiOutlineSave,
  HiOutlineTrash,
} from "react-icons/hi";
import { toast } from "sonner";

import { AssetField } from "@/components/admin/asset-field";
import { ProductStatusBadge } from "@/components/admin/products/product-status-badge";
import { KinguinProductPicker } from "@/components/admin/products/kinguin-product-picker";
import { SmmServicePicker } from "@/components/admin/products/smm-service-picker";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  createProductAction,
  updateProductAction,
} from "@/lib/actions/products";
import { applyMarkupPct } from "@/lib/fx/markup";
import { calculateMarginPercent, slugify } from "@/lib/products/format";
import type { CategoryOptionDto, ProductDetailDto } from "@/types/products";
import type { KinguinSearchHitDto } from "@/types/kinguin-admin";
import type { SmmServiceListItemDto } from "@/types/smm-provider";
import type { AssetDraft } from "@/types/assets";

type SmmPickerProps = {
  items: SmmServiceListItemDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  q: string | undefined;
  usdClpRate: number;
  defaultMarkupPct: number;
};

type KinguinPickerProps = {
  items: KinguinSearchHitDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  q: string | undefined;
  eurClpRate: number;
  defaultMarkupPct: number;
};

type ProductFormProps = {
  mode: "create" | "edit";
  categories: CategoryOptionDto[];
  product?: ProductDetailDto;
  archiveSlot?: React.ReactNode;
  keysSlot?: React.ReactNode;
  smmPicker?: SmmPickerProps;
  kinguinPicker?: KinguinPickerProps;
};

type FormState = {
  name: string;
  slug: string;
  description: string;
  coverImageUrl: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  deliveryMethod: "SMM" | "KINGUIN" | "MANUAL";
  price: string;
  compareAtPrice: string;
  currency: string;
  qty: string;
  textQty: string;
  isFeatured: boolean;
  isOffer: boolean;
  isPreorder: boolean;
  regionId: string;
  regionalLimitations: string;
  countryLimitation: string;
  activationDetails: string;
  releaseDate: string;
  ageRating: string;
  platform: string;
  genres: string;
  languages: string;
  developers: string;
  publishers: string;
  tags: string;
  sourceCostPrice: string;
  categoryIds: string[];
};

function toFormState(product?: ProductDetailDto): FormState {
  if (!product) {
    return {
      name: "",
      slug: "",
      description: "",
      coverImageUrl: "",
      status: "DRAFT",
      deliveryMethod: "MANUAL",
      price: "0",
      compareAtPrice: "",
      currency: "CLP",
      qty: "0",
      textQty: "",
      isFeatured: false,
      isOffer: false,
      isPreorder: false,
      regionId: "",
      regionalLimitations: "",
      countryLimitation: "",
      activationDetails: "",
      releaseDate: "",
      ageRating: "",
      platform: "",
      genres: "",
      languages: "",
      developers: "",
      publishers: "",
      tags: "",
      sourceCostPrice: "",
      categoryIds: [],
    };
  }

  return {
    name: product.name,
    slug: product.slug,
    description: product.description ?? "",
    coverImageUrl: product.coverImageUrl ?? "",
    status: product.status,
    deliveryMethod: product.deliveryMethod,
    price: product.price,
    compareAtPrice: product.compareAtPrice ?? "",
    currency: product.currency,
    qty: String(product.qty),
    textQty: product.textQty != null ? String(product.textQty) : "",
    isFeatured: product.isFeatured,
    isOffer: product.isOffer,
    isPreorder: product.isPreorder,
    regionId: product.regionId != null ? String(product.regionId) : "",
    regionalLimitations: product.regionalLimitations ?? "",
    countryLimitation: product.countryLimitation.join(", "),
    activationDetails: product.activationDetails ?? "",
    releaseDate: product.releaseDate ? product.releaseDate.slice(0, 10) : "",
    ageRating: product.ageRating ?? "",
    platform: product.platform ?? "",
    genres: product.genres.join(", "),
    languages: product.languages.join(", "),
    developers: product.developers.join(", "),
    publishers: product.publishers.join(", "),
    tags: product.tags.join(", "),
    sourceCostPrice: product.sourceCostPrice ?? "",
    categoryIds: product.categoryIds,
  };
}

function csvToArray(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function ProductForm({
  mode,
  categories,
  product,
  archiveSlot,
  keysSlot,
  smmPicker,
  kinguinPicker,
}: ProductFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [form, setForm] = useState<FormState>(() => toFormState(product));
  const [assets, setAssets] = useState<AssetDraft[]>(() => product?.assets ?? []);
  const [smmServiceDbId, setSmmServiceDbId] = useState<string | null>(null);
  const [kinguinId, setKinguinId] = useState<number | null>(null);

  const margin = useMemo(() => {
    const price = Number.parseFloat(form.price.replace(",", "."));
    const costRaw = form.sourceCostPrice.trim();
    const cost =
      costRaw === "" ? null : Number.parseFloat(costRaw.replace(",", "."));
    const value = calculateMarginPercent(
      Number.isFinite(price) ? price : 0,
      cost != null && Number.isFinite(cost) ? cost : null,
    );
    return value;
  }, [form.price, form.sourceCostPrice]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSelectSmmService(service: SmmServiceListItemDto) {
    if (!smmPicker) return;
    const rateUsd = Number.parseFloat(service.rate);
    const baseClp = Number.isFinite(rateUsd)
      ? Math.round(rateUsd * smmPicker.usdClpRate)
      : 0;
    const priceClp = applyMarkupPct(baseClp, smmPicker.defaultMarkupPct);

    setSmmServiceDbId(service.id);
    setForm((prev) => ({
      ...prev,
      deliveryMethod: "SMM",
      name: prev.name.trim() ? prev.name : service.name,
      slug: slugTouched ? prev.slug : slugify(service.name),
      textQty: String(service.min),
      price: String(priceClp),
      sourceCostPrice: String(baseClp),
    }));
  }

  function handleClearSmmService() {
    setSmmServiceDbId(null);
  }

  function handleSelectKinguinProduct(hit: KinguinSearchHitDto) {
    if (!kinguinPicker) return;
    const priceEur = hit.priceEur;
    const baseClp =
      priceEur != null && Number.isFinite(priceEur)
        ? Math.round(priceEur * kinguinPicker.eurClpRate)
        : 0;
    const priceClp = applyMarkupPct(baseClp, kinguinPicker.defaultMarkupPct);

    setKinguinId(hit.kinguinId);
    setForm((prev) => ({
      ...prev,
      deliveryMethod: "KINGUIN",
      name: prev.name.trim() ? prev.name : hit.name,
      slug: slugTouched ? prev.slug : slugify(hit.name),
      coverImageUrl:
        prev.coverImageUrl.trim() || hit.coverUrl || hit.coverThumbnailUrl || "",
      platform: prev.platform.trim() || hit.platform || "",
      qty: String(hit.qty || 0),
      price: String(priceClp),
      sourceCostPrice: baseClp > 0 ? String(baseClp) : prev.sourceCostPrice,
    }));
  }

  function handleClearKinguinProduct() {
    setKinguinId(null);
  }

  function toggleCategory(categoryId: string) {
    setForm((prev) => {
      const exists = prev.categoryIds.includes(categoryId);
      return {
        ...prev,
        categoryIds: exists
          ? prev.categoryIds.filter((id) => id !== categoryId)
          : [...prev.categoryIds, categoryId],
      };
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});

    const payload = {
      ...(mode === "edit" && product ? { id: product.id } : {}),
      name: form.name,
      slug: form.slug,
      description: form.description || null,
      coverImageUrl: null,
      status: form.status,
      deliveryMethod: form.deliveryMethod,
      price: form.price,
      compareAtPrice: form.isOffer ? form.compareAtPrice || null : null,
      currency: form.currency,
      qty: Number.parseInt(form.qty || "0", 10),
      textQty: form.textQty === "" ? null : Number.parseInt(form.textQty, 10),
      isFeatured: form.isFeatured,
      isOffer: form.isOffer,
      isPreorder: form.isPreorder,
      regionId:
        form.regionId === "" ? null : Number.parseInt(form.regionId, 10),
      regionalLimitations: form.regionalLimitations || null,
      countryLimitation: csvToArray(form.countryLimitation),
      activationDetails: form.activationDetails || null,
      releaseDate: form.releaseDate || null,
      ageRating: form.ageRating || null,
      platform: form.platform || null,
      genres: csvToArray(form.genres),
      languages: csvToArray(form.languages),
      developers: csvToArray(form.developers),
      publishers: csvToArray(form.publishers),
      tags: csvToArray(form.tags),
      sourceCostPrice: form.sourceCostPrice || null,
      categoryIds: form.categoryIds,
      assets,
      smmServiceDbId:
        form.deliveryMethod === "SMM" ? (smmServiceDbId ?? undefined) : undefined,
      kinguinId:
        form.deliveryMethod === "KINGUIN" ? (kinguinId ?? undefined) : undefined,
      kinguinMarkupPct:
        form.deliveryMethod === "KINGUIN"
          ? (kinguinPicker?.defaultMarkupPct ?? undefined)
          : undefined,
    };

    startTransition(() => {
      void (async () => {
        const result =
          mode === "create"
            ? await createProductAction(payload)
            : await updateProductAction(payload);

        if (!result.success) {
          setFieldErrors(result.fieldErrors ?? {});
          toast.error(result.message);
          return;
        }

        toast.success(
          mode === "create" ? "Producto creado" : "Cambios guardados",
        );
        router.push(`/admin/products/${result.data.id}`);
        router.refresh();
      })();
    });
  }

  const fieldError = (key: string) => fieldErrors[key]?.[0];

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            render={<Link href="/admin/products" />}
            nativeButton={false}
            aria-label="Volver"
          >
            <HiOutlineArrowLeft className="size-4" />
          </Button>
          <div className="min-w-0 space-y-1">
            <h1 className="truncate font-heading text-2xl font-semibold tracking-tight">
              {mode === "create"
                ? "Nuevo producto"
                : (product?.name ?? "Editar producto")}
            </h1>
            {product ? (
              <p className="text-sm text-muted-foreground">
                Código: {product.code}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Completa la información del catálogo.
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {archiveSlot}
          <Button
            type="submit"
            disabled={isPending}
            className="w-full sm:w-auto"
          >
            <HiOutlineSave className="size-4" />
            {isPending ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <div className="flex flex-col gap-6">
          <Card className="shadow-none ring-border">
            <CardHeader>
              <CardTitle>Fotos y videos</CardTitle>
              <CardDescription>
                Agrega varias fotografías, videos manuales o enlaces de YouTube. Marca una foto como portada.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AssetField
                folder="products"
                value={assets}
                onChange={setAssets}
                disabled={isPending}
                error={fieldError("assets")}
              />
            </CardContent>
          </Card>

          <Card className="shadow-none ring-border">
            <CardHeader>
              <CardTitle>Información general</CardTitle>
              <CardDescription>
                Datos principales visibles en el catálogo.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="name">Nombre del producto</Label>
                  <Input
                    id="name"
                    value={form.name}
                    aria-invalid={Boolean(fieldError("name"))}
                    onChange={(event) => {
                      const name = event.target.value;
                      updateField("name", name);
                      if (!slugTouched) {
                        updateField("slug", slugify(name));
                      }
                    }}
                  />
                  {fieldError("name") ? (
                    <p className="text-xs text-destructive">
                      {fieldError("name")}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="slug">Slug</Label>
                  <Input
                    id="slug"
                    value={form.slug}
                    aria-invalid={Boolean(fieldError("slug"))}
                    onChange={(event) => {
                      setSlugTouched(true);
                      updateField("slug", event.target.value);
                    }}
                  />
                  {fieldError("slug") ? (
                    <p className="text-xs text-destructive">
                      {fieldError("slug")}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="description">Descripción detallada</Label>
                  <Textarea
                    id="description"
                    value={form.description}
                    rows={5}
                    onChange={(event) =>
                      updateField("description", event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Categorías</Label>
                  <div className="flex flex-wrap gap-2">
                    {categories.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No hay categorías creadas.
                      </p>
                    ) : (
                      categories.map((category) => {
                        const selected = form.categoryIds.includes(category.id);
                        return (
                          <button
                            key={category.id}
                            type="button"
                            onClick={() => toggleCategory(category.id)}
                            className={
                              selected
                                ? "rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
                                : "rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground hover:bg-muted"
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
                  <Label>Método de entrega</Label>
                  <Select
                    items={[
                      { value: "MANUAL", label: "Manual" },
                      { value: "KINGUIN", label: "Kinguin" },
                      { value: "SMM", label: "SMM" },
                    ]}
                    value={form.deliveryMethod}
                    onValueChange={(value) => {
                      if (
                        value === "SMM" ||
                        value === "KINGUIN" ||
                        value === "MANUAL"
                      ) {
                        updateField("deliveryMethod", value);
                        if (value !== "SMM") {
                          setSmmServiceDbId(null);
                        }
                        if (value !== "KINGUIN") {
                          setKinguinId(null);
                        }
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MANUAL">Manual</SelectItem>
                      <SelectItem value="KINGUIN">Kinguin</SelectItem>
                      <SelectItem value="SMM">SMM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {mode === "create" &&
              form.deliveryMethod === "SMM" &&
              smmPicker ? (
                <SmmServicePicker
                  items={smmPicker.items}
                  total={smmPicker.total}
                  page={smmPicker.page}
                  pageSize={smmPicker.pageSize}
                  totalPages={smmPicker.totalPages}
                  q={smmPicker.q}
                  selectedId={smmServiceDbId}
                  onSelect={handleSelectSmmService}
                  onClear={handleClearSmmService}
                />
              ) : null}

              {mode === "create" &&
              form.deliveryMethod === "KINGUIN" &&
              kinguinPicker ? (
                <KinguinProductPicker
                  items={kinguinPicker.items}
                  total={kinguinPicker.total}
                  page={kinguinPicker.page}
                  pageSize={kinguinPicker.pageSize}
                  totalPages={kinguinPicker.totalPages}
                  q={kinguinPicker.q}
                  selectedKinguinId={kinguinId}
                  onSelect={handleSelectKinguinProduct}
                  onClear={handleClearKinguinProduct}
                />
              ) : null}

              {fieldError("smmServiceDbId") ? (
                <p className="text-sm text-destructive">
                  {fieldError("smmServiceDbId")}
                </p>
              ) : null}

              {fieldError("kinguinId") ? (
                <p className="text-sm text-destructive">
                  {fieldError("kinguinId")}
                </p>
              ) : null}

              <Collapsible>
                <CollapsibleTrigger className="flex w-full items-center justify-between rounded-2xl border border-border px-3 py-2 text-sm font-medium hover:bg-muted">
                  Información avanzada
                  <HiOutlineChevronDown className="size-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="regionId">ID de región</Label>
                    <Input
                      id="regionId"
                      inputMode="numeric"
                      value={form.regionId}
                      onChange={(event) =>
                        updateField("regionId", event.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ageRating">Clasificación de edad</Label>
                    <Input
                      id="ageRating"
                      value={form.ageRating}
                      onChange={(event) =>
                        updateField("ageRating", event.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="regionalLimitations">
                      Limitaciones regionales
                    </Label>
                    <Input
                      id="regionalLimitations"
                      value={form.regionalLimitations}
                      onChange={(event) =>
                        updateField("regionalLimitations", event.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="countryLimitation">
                      Países restringidos
                    </Label>
                    <Input
                      id="countryLimitation"
                      placeholder="CL, AR, PE"
                      value={form.countryLimitation}
                      onChange={(event) =>
                        updateField("countryLimitation", event.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="activationDetails">
                      Detalles de activación
                    </Label>
                    <Textarea
                      id="activationDetails"
                      value={form.activationDetails}
                      onChange={(event) =>
                        updateField("activationDetails", event.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="releaseDate">Fecha de lanzamiento</Label>
                    <Input
                      id="releaseDate"
                      type="date"
                      value={form.releaseDate}
                      onChange={(event) =>
                        updateField("releaseDate", event.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="platform">Plataforma</Label>
                    <Input
                      id="platform"
                      value={form.platform}
                      onChange={(event) =>
                        updateField("platform", event.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="genres">Géneros</Label>
                    <Input
                      id="genres"
                      value={form.genres}
                      onChange={(event) =>
                        updateField("genres", event.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="languages">Idiomas</Label>
                    <Input
                      id="languages"
                      value={form.languages}
                      onChange={(event) =>
                        updateField("languages", event.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="developers">Desarrolladores</Label>
                    <Input
                      id="developers"
                      value={form.developers}
                      onChange={(event) =>
                        updateField("developers", event.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="publishers">Publishers</Label>
                    <Input
                      id="publishers"
                      value={form.publishers}
                      onChange={(event) =>
                        updateField("publishers", event.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="tags">Tags</Label>
                    <Input
                      id="tags"
                      value={form.tags}
                      onChange={(event) =>
                        updateField("tags", event.target.value)
                      }
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>

          {keysSlot}
        </div>

        <div className="flex flex-col gap-6">
          <Card className="shadow-none ring-border">
            <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
              <div>
                <CardTitle>Estado</CardTitle>
                <CardDescription>
                  Visibilidad y flags del producto.
                </CardDescription>
              </div>
              <ProductStatusBadge
                status={
                  form.status === "ARCHIVED"
                    ? "ARCHIVED"
                    : form.status === "DRAFT"
                      ? "DRAFT"
                      : "ACTIVE"
                }
              />
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="space-y-2">
                <Label>Estado del producto</Label>
                <Select
                  items={[
                    { value: "DRAFT", label: "Borrador" },
                    { value: "ACTIVE", label: "Activo" },
                    { value: "ARCHIVED", label: "Archivado" },
                  ]}
                  value={form.status}
                  onValueChange={(value) => {
                    if (
                      value === "DRAFT" ||
                      value === "ACTIVE" ||
                      value === "ARCHIVED"
                    ) {
                      updateField("status", value);
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Borrador</SelectItem>
                    <SelectItem value="ACTIVE">Activo</SelectItem>
                    <SelectItem value="ARCHIVED">Archivado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-start justify-between gap-3 rounded-2xl border border-border p-3">
                <div className="space-y-1">
                  <Label htmlFor="isFeatured">Destacar en inicio</Label>
                  <p className="text-xs text-muted-foreground">
                    Aparece en secciones destacadas del storefront.
                  </p>
                </div>
                <Switch
                  id="isFeatured"
                  checked={form.isFeatured}
                  onCheckedChange={(checked) =>
                    updateField("isFeatured", checked)
                  }
                />
              </div>

              <div className="flex items-start justify-between gap-3 rounded-2xl border border-border p-3">
                <div className="space-y-1">
                  <Label htmlFor="isOffer">Producto en oferta</Label>
                  <p className="text-xs text-muted-foreground">
                    Usa precio actual como oferta y precio base como anterior.
                  </p>
                </div>
                <Switch
                  id="isOffer"
                  checked={form.isOffer}
                  onCheckedChange={(checked) => updateField("isOffer", checked)}
                />
              </div>

              <div className="flex items-start justify-between gap-3 rounded-2xl border border-border p-3">
                <div className="space-y-1">
                  <Label htmlFor="isPreorder">Preventa</Label>
                  <p className="text-xs text-muted-foreground">
                    Marca el producto como disponible en preventa.
                  </p>
                </div>
                <Switch
                  id="isPreorder"
                  checked={form.isPreorder}
                  onCheckedChange={(checked) =>
                    updateField("isPreorder", checked)
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none ring-border">
            <CardHeader>
              <CardTitle>Precios</CardTitle>
              <CardDescription>
                Moneda, precio actual, base y costo.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="currency">Moneda</Label>
                <Input
                  id="currency"
                  value={form.currency}
                  maxLength={3}
                  onChange={(event) =>
                    updateField("currency", event.target.value.toUpperCase())
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">
                  {form.isOffer ? "Precio de oferta" : "Precio actual"}
                </Label>
                <Input
                  id="price"
                  inputMode="decimal"
                  value={form.price}
                  aria-invalid={Boolean(fieldError("price"))}
                  onChange={(event) => updateField("price", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="compareAtPrice">Precio anterior / base</Label>
                <Input
                  id="compareAtPrice"
                  inputMode="decimal"
                  disabled={!form.isOffer}
                  value={form.compareAtPrice}
                  aria-invalid={Boolean(fieldError("compareAtPrice"))}
                  onChange={(event) =>
                    updateField("compareAtPrice", event.target.value)
                  }
                />
                {fieldError("compareAtPrice") ? (
                  <p className="text-xs text-destructive">
                    {fieldError("compareAtPrice")}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="sourceCostPrice">Costo de adquisición</Label>
                <Input
                  id="sourceCostPrice"
                  inputMode="decimal"
                  value={form.sourceCostPrice}
                  onChange={(event) =>
                    updateField("sourceCostPrice", event.target.value)
                  }
                />
              </div>
              <div className="rounded-2xl bg-muted/60 px-3 py-2 text-sm">
                Margen:{" "}
                <span className="font-medium">
                  {margin == null ? "—" : `${margin.toFixed(1)}%`}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none ring-border">
            <CardHeader>
              <CardTitle>Inventario</CardTitle>
              <CardDescription>
                Stock según el método de entrega.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {form.deliveryMethod !== "MANUAL" ? (
                <div className="space-y-2">
                  <Label htmlFor="qty">Cantidad (qty)</Label>
                  <Input
                    id="qty"
                    inputMode="numeric"
                    value={form.qty}
                    onChange={(event) => updateField("qty", event.target.value)}
                  />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Para entrega manual el stock visible proviene de keys
                  disponibles.
                  {product
                    ? ` Actualmente: ${product.stockLabel}.`
                    : " Agrega keys después de crear el producto."}
                </p>
              )}

              {form.deliveryMethod === "SMM" ? (
                <div className="space-y-2">
                  <Label htmlFor="textQty">Cantidad de texto (textQty)</Label>
                  <Input
                    id="textQty"
                    inputMode="numeric"
                    value={form.textQty}
                    onChange={(event) =>
                      updateField("textQty", event.target.value)
                    }
                  />
                </div>
              ) : null}

              {form.deliveryMethod === "KINGUIN" && product ? (
                <p className="text-sm text-muted-foreground">
                  Oferta remota predeterminada:{" "}
                  {product.defaultOfferAvailableQty ?? "—"}
                </p>
              ) : null}

              {form.deliveryMethod === "MANUAL" ? (
                <div className="space-y-2 opacity-60">
                  <Label htmlFor="qty-manual">qty (referencia)</Label>
                  <Input
                    id="qty-manual"
                    inputMode="numeric"
                    value={form.qty}
                    onChange={(event) => updateField("qty", event.target.value)}
                  />
                </div>
              ) : null}
            </CardContent>
          </Card>

          {mode === "edit" ? (
            <div className="hidden items-center gap-2 text-sm text-muted-foreground xl:flex">
              <HiOutlineTrash className="size-4" />
              Usa Archivar para ocultar el producto sin borrar historial.
            </div>
          ) : null}
        </div>
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 border-t border-border bg-background/95 p-4 backdrop-blur md:hidden">
        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? "Guardando..." : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
