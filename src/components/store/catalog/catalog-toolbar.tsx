"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  HiChevronDown,
  HiOutlineCheckCircle,
  HiOutlineCollection,
  HiOutlineFilter,
  HiOutlineKey,
  HiOutlineLightningBolt,
  HiOutlineRefresh,
  HiOutlineTag,
  HiOutlineTruck,
  HiOutlineX,
} from "react-icons/hi";

import { SsrSearchInput } from "@/components/admin/ssr-search-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import {
  buildCatalogHref,
  catalogHasActiveFilters,
  type StoreCatalogHrefOverrides,
} from "@/lib/catalog/url";
import { formatMoney } from "@/lib/products/format";
import { cn } from "@/lib/utils";
import type {
  StoreCatalogAvailability,
  StoreCatalogQuery,
  StoreCatalogSortField,
} from "@/lib/validations/catalog";
import type { StoreNavCategoryDto } from "@/types/categories";
import type { StoreCatalogPriceBounds } from "@/types/products";

type CatalogToolbarProps = {
  query: StoreCatalogQuery;
  categories: StoreNavCategoryDto[];
  priceBounds: StoreCatalogPriceBounds;
  total: number;
  categoryName?: string | null;
};

const deliveryOptions = [
  { value: "all" as const, label: "Todos", icon: HiOutlineCollection },
  { value: "MANUAL" as const, label: "Manual", icon: HiOutlineKey },
  { value: "SMM" as const, label: "SMM", icon: HiOutlineTruck },
  { value: "KINGUIN" as const, label: "Kinguin", icon: HiOutlineLightningBolt },
];

const availabilityOptions: Array<{
  value: "all" | StoreCatalogAvailability;
  label: string;
}> = [
  { value: "all", label: "Todas" },
  { value: "in_stock", label: "Disponibles" },
  { value: "out_of_stock", label: "Agotados" },
];

const sortOptions: Array<{
  sort: StoreCatalogSortField;
  order: "asc" | "desc";
  label: string;
}> = [
  { sort: "relevance", order: "desc", label: "Relevancia" },
  { sort: "updatedAt", order: "desc", label: "Más recientes" },
  { sort: "price", order: "asc", label: "Precio: menor a mayor" },
  { sort: "price", order: "desc", label: "Precio: mayor a menor" },
  { sort: "name", order: "asc", label: "Nombre A–Z" },
  { sort: "createdAt", order: "desc", label: "Nuevos" },
];

function FilterOptionButton({
  active,
  label,
  icon: Icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-2xl px-2.5 py-2 text-left text-sm transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-foreground hover:bg-muted",
      )}
    >
      {Icon ? <Icon className="size-4 shrink-0 opacity-80" /> : null}
      <span className="truncate">{label}</span>
    </button>
  );
}

function CatalogFiltersPanel({
  query,
  categories,
  priceBounds,
  onApply,
  onClear,
}: {
  query: StoreCatalogQuery;
  categories: StoreNavCategoryDto[];
  priceBounds: StoreCatalogPriceBounds;
  onApply: (overrides: StoreCatalogHrefOverrides) => void;
  onClear: () => void;
}) {
  const rangeMin = query.minPrice ?? priceBounds.min;
  const rangeMax = query.maxPrice ?? priceBounds.max;
  const [priceDraft, setPriceDraft] = useState<[number, number]>([
    rangeMin,
    rangeMax,
  ]);

  useEffect(() => {
    setPriceDraft([
      query.minPrice ?? priceBounds.min,
      query.maxPrice ?? priceBounds.max,
    ]);
  }, [query.minPrice, query.maxPrice, priceBounds.min, priceBounds.max]);

  const flatCategories = useMemo(() => {
    const items: Array<{ id: string; name: string; slug: string }> = [];
    for (const root of categories) {
      items.push({ id: root.id, name: root.name, slug: root.slug });
      for (const child of root.children) {
        items.push({
          id: child.id,
          name: `${root.name} · ${child.name}`,
          slug: child.slug,
        });
      }
    }
    return items;
  }, [categories]);

  const activeFilterCount = [
    query.category,
    query.deliveryMethod,
    query.availability,
    query.minPrice != null || query.maxPrice != null ? "price" : null,
    query.offers ? "offers" : null,
  ].filter(Boolean).length;

  function commitPrice(next: [number, number]) {
    let [min, max] = next;
    if (min > max) {
      [min, max] = [max, min];
    }
    min = Math.max(priceBounds.min, Math.min(min, priceBounds.max));
    max = Math.max(priceBounds.min, Math.min(max, priceBounds.max));
    setPriceDraft([min, max]);
    onApply({
      page: 1,
      minPrice: min <= priceBounds.min ? undefined : min,
      maxPrice: max >= priceBounds.max ? undefined : max,
    });
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="space-y-1">
          <p className="flex items-center gap-2 text-sm font-medium">
            <HiOutlineFilter className="size-4 text-primary" />
            Filtrar catálogo
          </p>
          <p className="text-xs text-muted-foreground">
            Categoría, entrega, precio y disponibilidad.
          </p>
        </div>
        {activeFilterCount > 0 ? (
          <Button type="button" variant="ghost" size="xs" onClick={onClear}>
            <HiOutlineRefresh className="size-3.5" />
            Limpiar
          </Button>
        ) : null}
      </div>

      <div className="grid gap-0 sm:grid-cols-2 lg:grid-cols-3">
        <section className="border-b border-border p-3 sm:border-r">
          <div className="mb-2 flex items-center gap-1.5 px-1 text-xs font-medium text-muted-foreground">
            <HiOutlineTag className="size-3.5" />
            Categoría
          </div>
          <div className="max-h-48 space-y-0.5 overflow-y-auto">
            <FilterOptionButton
              active={!query.category}
              label="Todas"
              icon={HiOutlineCollection}
              onClick={() => onApply({ category: undefined, page: 1 })}
            />
            {flatCategories.map((category) => (
              <FilterOptionButton
                key={category.id}
                active={query.category === category.slug}
                label={category.name}
                icon={HiOutlineTag}
                onClick={() =>
                  onApply({ category: category.slug, page: 1 })
                }
              />
            ))}
          </div>
        </section>

        <section className="border-b border-border p-3 sm:border-r-0 lg:border-r">
          <div className="mb-2 flex items-center gap-1.5 px-1 text-xs font-medium text-muted-foreground">
            Entrega
          </div>
          <div className="space-y-0.5">
            {deliveryOptions.map((option) => (
              <FilterOptionButton
                key={option.value}
                active={
                  option.value === "all"
                    ? !query.deliveryMethod
                    : query.deliveryMethod === option.value
                }
                label={option.label}
                icon={option.icon}
                onClick={() =>
                  onApply({
                    deliveryMethod:
                      option.value === "all" ? undefined : option.value,
                    page: 1,
                  })
                }
              />
            ))}
          </div>

          <div className="mt-4 mb-2 px-1 text-xs font-medium text-muted-foreground">
            Disponibilidad
          </div>
          <div className="space-y-0.5">
            {availabilityOptions.map((option) => (
              <FilterOptionButton
                key={option.value}
                active={
                  option.value === "all"
                    ? !query.availability
                    : query.availability === option.value
                }
                label={option.label}
                icon={HiOutlineCheckCircle}
                onClick={() =>
                  onApply({
                    availability:
                      option.value === "all" ? undefined : option.value,
                    page: 1,
                  })
                }
              />
            ))}
          </div>

          <div className="mt-4">
            <FilterOptionButton
              active={Boolean(query.offers)}
              label="Solo ofertas"
              icon={HiOutlineLightningBolt}
              onClick={() =>
                onApply({
                  offers: query.offers ? undefined : true,
                  page: 1,
                })
              }
            />
          </div>
        </section>

        <section className="border-b border-border p-3 sm:col-span-2 lg:col-span-1 lg:border-b-0">
          <div className="mb-3 px-1 text-xs font-medium text-muted-foreground">
            Rango de precio (CLP)
          </div>
          <Slider
            min={priceBounds.min}
            max={priceBounds.max}
            step={Math.max(1, Math.round((priceBounds.max - priceBounds.min) / 100))}
            value={priceDraft}
            onValueChange={(value) => {
              if (Array.isArray(value) && value.length >= 2) {
                setPriceDraft([value[0], value[1]]);
              }
            }}
            onValueCommitted={(value) => {
              if (Array.isArray(value) && value.length >= 2) {
                commitPrice([value[0], value[1]]);
              }
            }}
            className="px-1"
          />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="catalog-min-price" className="text-xs">
                Mínimo
              </Label>
              <Input
                id="catalog-min-price"
                inputMode="numeric"
                value={priceDraft[0]}
                onChange={(event) => {
                  const next = Number.parseInt(event.target.value, 10);
                  if (Number.isFinite(next)) {
                    setPriceDraft([next, priceDraft[1]]);
                  }
                }}
                onBlur={() => commitPrice(priceDraft)}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="catalog-max-price" className="text-xs">
                Máximo
              </Label>
              <Input
                id="catalog-max-price"
                inputMode="numeric"
                value={priceDraft[1]}
                onChange={(event) => {
                  const next = Number.parseInt(event.target.value, 10);
                  if (Number.isFinite(next)) {
                    setPriceDraft([priceDraft[0], next]);
                  }
                }}
                onBlur={() => commitPrice(priceDraft)}
                className="h-9"
              />
            </div>
          </div>
          <p className="mt-2 px-1 text-xs text-muted-foreground">
            {formatMoney(String(priceDraft[0]), "CLP")} –{" "}
            {formatMoney(String(priceDraft[1]), "CLP")}
          </p>
        </section>
      </div>
    </div>
  );
}

export function CatalogToolbar({
  query,
  categories,
  priceBounds,
  total,
  categoryName,
}: CatalogToolbarProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const hasFilters = catalogHasActiveFilters(query);
  const activeFilterCount = [
    query.category,
    query.deliveryMethod,
    query.availability,
    query.minPrice != null || query.maxPrice != null ? "price" : null,
    query.offers ? "offers" : null,
    query.sort !== "relevance" || query.order !== "desc" ? "sort" : null,
  ].filter(Boolean).length;

  const currentSortLabel =
    sortOptions.find(
      (option) => option.sort === query.sort && option.order === query.order,
    )?.label ?? "Ordenar";

  function apply(overrides: StoreCatalogHrefOverrides) {
    startTransition(() => {
      router.push(buildCatalogHref(query, overrides));
    });
  }

  function clearFilters() {
    apply({
      category: undefined,
      deliveryMethod: undefined,
      availability: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      offers: undefined,
      sort: "relevance",
      order: "desc",
      page: 1,
    });
    setFiltersOpen(false);
  }

  const chips: Array<{ key: string; label: string; clear: StoreCatalogHrefOverrides }> =
    [];

  if (query.category) {
    chips.push({
      key: "category",
      label: categoryName ?? query.category,
      clear: { category: undefined, page: 1 },
    });
  }
  if (query.deliveryMethod) {
    chips.push({
      key: "delivery",
      label:
        deliveryOptions.find((o) => o.value === query.deliveryMethod)?.label ??
        query.deliveryMethod,
      clear: { deliveryMethod: undefined, page: 1 },
    });
  }
  if (query.availability) {
    chips.push({
      key: "availability",
      label:
        availabilityOptions.find((o) => o.value === query.availability)
          ?.label ?? query.availability,
      clear: { availability: undefined, page: 1 },
    });
  }
  if (query.offers) {
    chips.push({
      key: "offers",
      label: "Ofertas",
      clear: { offers: undefined, page: 1 },
    });
  }
  if (query.minPrice != null || query.maxPrice != null) {
    chips.push({
      key: "price",
      label: `$${query.minPrice ?? priceBounds.min} – $${query.maxPrice ?? priceBounds.max}`,
      clear: { minPrice: undefined, maxPrice: undefined, page: 1 },
    });
  }
  if (query.q) {
    chips.push({
      key: "q",
      label: `“${query.q}”`,
      clear: { q: undefined, page: 1 },
    });
  }

  return (
    <div className={cn("flex flex-col gap-3", isPending && "opacity-90")}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SsrSearchInput
          value={query.q ?? ""}
          buildHref={(q) => buildCatalogHref(query, { q, page: 1 })}
          placeholder="Buscar productos..."
          aria-label="Buscar en el catálogo"
          className="w-full sm:max-w-sm"
        />

        <div className="flex flex-wrap items-center gap-2">
          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="lg:hidden"
                />
              }
            >
              <HiOutlineFilter className="size-4" />
              Filtros
              {activeFilterCount > 0 ? (
                <Badge className="h-5 min-w-5 justify-center rounded-full px-1.5">
                  {activeFilterCount}
                </Badge>
              ) : null}
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="max-h-[88dvh] overflow-y-auto rounded-t-3xl p-0"
            >
              <SheetHeader className="sr-only">
                <SheetTitle>Filtros del catálogo</SheetTitle>
                <SheetDescription>
                  Ajusta categoría, precio y disponibilidad.
                </SheetDescription>
              </SheetHeader>
              <CatalogFiltersPanel
                query={query}
                categories={categories}
                priceBounds={priceBounds}
                onApply={(overrides) => {
                  apply(overrides);
                }}
                onClear={clearFilters}
              />
            </SheetContent>
          </Sheet>

          <Popover>
            <PopoverTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="hidden lg:inline-flex"
                />
              }
            >
              <HiOutlineFilter className="size-4" />
              Filtros
              {activeFilterCount > 0 ? (
                <Badge className="h-5 min-w-5 justify-center rounded-full px-1.5">
                  {activeFilterCount}
                </Badge>
              ) : null}
              <HiChevronDown className="size-3.5 opacity-70" />
            </PopoverTrigger>
            <PopoverContent
              align="end"
              sideOffset={8}
              className="w-[min(100vw-2rem,48rem)] max-w-none gap-0 p-0"
            >
              <PopoverHeader className="sr-only">
                <PopoverTitle>Filtros</PopoverTitle>
                <PopoverDescription>Filtrar productos</PopoverDescription>
              </PopoverHeader>
              <CatalogFiltersPanel
                query={query}
                categories={categories}
                priceBounds={priceBounds}
                onApply={apply}
                onClear={clearFilters}
              />
            </PopoverContent>
          </Popover>

          <Popover open={sortOpen} onOpenChange={setSortOpen}>
            <PopoverTrigger
              render={<Button type="button" variant="outline" size="sm" />}
            >
              {currentSortLabel}
              <HiChevronDown className="size-3.5 opacity-70" />
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 gap-0 p-2">
              {sortOptions.map((option) => (
                <FilterOptionButton
                  key={`${option.sort}-${option.order}`}
                  active={
                    query.sort === option.sort && query.order === option.order
                  }
                  label={option.label}
                  onClick={() => {
                    apply({
                      sort: option.sort,
                      order: option.order,
                      page: 1,
                    });
                    setSortOpen(false);
                  }}
                />
              ))}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{total}</span>{" "}
          {total === 1 ? "resultado" : "resultados"}
          {query.q ? (
            <>
              {" "}
              para{" "}
              <span className="font-medium text-foreground">“{query.q}”</span>
            </>
          ) : null}
        </p>

        {hasFilters && chips.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {chips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => apply(chip.clear)}
                className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
              >
                {chip.label}
                <HiOutlineX className="size-3.5 opacity-70" />
              </button>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={clearFilters}
            >
              Limpiar todo
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
