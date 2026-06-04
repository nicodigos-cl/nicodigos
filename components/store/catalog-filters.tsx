"use client";

import { useEffect, useState } from "react";
import { IconFilter, IconSearch, IconX } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { getPlatformIconConfig } from "@/lib/store/platform-icons";
import {
  CATALOG_PAGE_SIZE_OPTIONS,
  CATALOG_SORT_OPTIONS,
  type CatalogFilterOptions,
  type CatalogFilters,
} from "@/lib/store/catalog/types";
import { cn } from "@/lib/utils";

type CatalogFiltersProps = {
  filters: CatalogFilters;
  options: CatalogFilterOptions;
  onChange: (patch: Partial<CatalogFilters>) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
  isLoading?: boolean;
  className?: string;
};

export function CatalogFiltersBar({
  filters,
  options,
  onChange,
  onReset,
  hasActiveFilters,
  isLoading,
  className,
}: CatalogFiltersProps) {
  const [searchDraft, setSearchDraft] = useState(filters.q);

  useEffect(() => {
    setSearchDraft(filters.q);
  }, [filters.q]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (searchDraft !== filters.q) {
        onChange({ q: searchDraft, page: 1 });
      }
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [searchDraft, filters.q, onChange]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Mobile view (< lg) */}
      <div className={cn("lg:hidden flex flex-col gap-3", isLoading && "opacity-90")}>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <IconSearch
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="catalog-search-mobile"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Steam, gift card, FIFA…"
              className="pl-8 h-10 w-full"
              disabled={isLoading}
            />
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="h-10 gap-1.5 shrink-0 relative bg-card border-border/60 font-semibold px-4 shadow-sm">
                <IconFilter className="size-4 text-primary" aria-hidden />
                <span>Filtrar</span>
                {hasActiveFilters && (
                  <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-primary" />
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[85vh] rounded-t-3xl p-0 flex flex-col bg-background border-t border-border">
              <SheetHeader className="p-5 border-b border-border/40 shrink-0">
                <div className="flex items-center justify-between">
                  <SheetTitle className="font-heading text-base font-bold">Filtros</SheetTitle>
                  {hasActiveFilters && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1 text-muted-foreground text-xs px-2 hover:bg-muted/50"
                      onClick={onReset}
                      disabled={isLoading}
                    >
                      <IconX className="size-3.5" aria-hidden />
                      Limpiar
                    </Button>
                  )}
                </div>
                <SheetDescription className="text-xs text-muted-foreground mt-1">
                  Ajusta las opciones para afinar tu búsqueda en el catálogo.
                </SheetDescription>
              </SheetHeader>
              
              <div className="flex-1 overflow-y-auto p-5 space-y-5 pb-24">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Categoría</Label>
                  <Select
                    value={filters.category || "all"}
                    onValueChange={(value) =>
                      onChange({ category: value === "all" ? "" : value, page: 1 })
                    }
                    disabled={isLoading}
                  >
                    <SelectTrigger className="w-full h-10">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las categorías</SelectItem>
                      {options.categories.map((category) => (
                        <SelectItem key={category.id} value={category.slug}>
                          {category.name} ({category.productCount})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Plataforma</Label>
                  <Select
                    value={filters.platform || "all"}
                    onValueChange={(value) =>
                      onChange({ platform: value === "all" ? "" : value, page: 1 })
                    }
                    disabled={isLoading}
                  >
                    <SelectTrigger className="w-full h-10">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las plataformas</SelectItem>
                      {options.platforms.map((platform) => {
                        const { label } = getPlatformIconConfig(platform);
                        return (
                          <SelectItem key={platform} value={platform}>
                            {label}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Ordenar</Label>
                  <Select
                    value={filters.sort}
                    onValueChange={(value) =>
                      onChange({
                        sort: value as CatalogFilters["sort"],
                        page: 1,
                      })
                    }
                    disabled={isLoading}
                  >
                    <SelectTrigger className="w-full h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATALOG_SORT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Por página</Label>
                  <Select
                    value={String(filters.pageSize)}
                    onValueChange={(value) =>
                      onChange({
                        pageSize: Number(value) as CatalogFilters["pageSize"],
                        page: 1,
                      })
                    }
                    disabled={isLoading}
                  >
                    <SelectTrigger className="w-full h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATALOG_PAGE_SIZE_OPTIONS.map((size) => (
                        <SelectItem key={size} value={String(size)}>
                          {size} productos
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3 border-t border-border/40 pt-4">
                  <div className="flex items-center justify-between gap-2 bg-muted/30 border border-border/50 rounded-xl p-3">
                    <Label htmlFor="catalog-offers-mobile" className="text-xs font-medium cursor-pointer">
                      Solo ofertas
                    </Label>
                    <Switch
                      id="catalog-offers-mobile"
                      checked={filters.offersOnly}
                      onCheckedChange={(checked) =>
                        onChange({ offersOnly: checked, page: 1 })
                      }
                      disabled={isLoading}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2 bg-muted/30 border border-border/50 rounded-xl p-3">
                    <Label htmlFor="catalog-preorders-mobile" className="text-xs font-medium cursor-pointer">
                      Solo preventas
                    </Label>
                    <Switch
                      id="catalog-preorders-mobile"
                      checked={filters.preordersOnly}
                      onCheckedChange={(checked) =>
                        onChange({ preordersOnly: checked, page: 1 })
                      }
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>
              
              <div className="absolute bottom-0 inset-x-0 bg-background/95 backdrop-blur-md border-t border-border/65 p-4 z-50">
                <SheetClose asChild>
                  <Button className="w-full font-bold h-11 text-sm shadow-md">
                    Ver resultados
                  </Button>
                </SheetClose>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {hasActiveFilters && (
          <div className="flex gap-2 overflow-x-auto pb-1 pt-0.5 -mx-4 px-4 scrollbar-none">
            {filters.category && (
              <Badge
                variant="secondary"
                className="shrink-0 gap-1 pl-2.5 pr-1.5 py-1 text-[11px] rounded-full border border-border/60 hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
                onClick={() => onChange({ category: "", page: 1 })}
              >
                <span>Cat: {options.categories.find(c => c.slug === filters.category)?.name || filters.category}</span>
                <IconX className="size-3" />
              </Badge>
            )}
            {filters.platform && (
              <Badge
                variant="secondary"
                className="shrink-0 gap-1 pl-2.5 pr-1.5 py-1 text-[11px] rounded-full border border-border/60 hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
                onClick={() => onChange({ platform: "", page: 1 })}
              >
                <span>Plat: {getPlatformIconConfig(filters.platform).label}</span>
                <IconX className="size-3" />
              </Badge>
            )}
            {filters.offersOnly && (
              <Badge
                variant="secondary"
                className="shrink-0 gap-1 pl-2.5 pr-1.5 py-1 text-[11px] rounded-full border border-border/60 hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
                onClick={() => onChange({ offersOnly: false, page: 1 })}
              >
                <span>Solo ofertas</span>
                <IconX className="size-3" />
              </Badge>
            )}
            {filters.preordersOnly && (
              <Badge
                variant="secondary"
                className="shrink-0 gap-1 pl-2.5 pr-1.5 py-1 text-[11px] rounded-full border border-border/60 hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
                onClick={() => onChange({ preordersOnly: false, page: 1 })}
              >
                <span>Solo preventas</span>
                <IconX className="size-3" />
              </Badge>
            )}
            {filters.sort !== "newest" && (
              <Badge
                variant="secondary"
                className="shrink-0 gap-1 pl-2.5 pr-1.5 py-1 text-[11px] rounded-full border border-border/60 hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
                onClick={() => onChange({ sort: "newest", page: 1 })}
              >
                <span>Orden: {CATALOG_SORT_OPTIONS.find(o => o.value === filters.sort)?.label}</span>
                <IconX className="size-3" />
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Desktop view (>= lg) */}
      <div
        className={cn(
          "hidden lg:block rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm backdrop-blur-sm sm:p-5",
          isLoading && "opacity-90"
        )}
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <IconFilter className="size-4 text-primary" aria-hidden />
            Filtra el catálogo
          </div>
          {hasActiveFilters ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-muted-foreground hover:bg-muted/50"
              onClick={onReset}
              disabled={isLoading}
            >
              <IconX className="size-3.5" aria-hidden />
              Limpiar filtros
            </Button>
          ) : null}
        </div>

        <div className="grid gap-4 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-4 space-y-1.5">
            <Label htmlFor="catalog-search" className="text-xs font-semibold">
              Buscar
            </Label>
            <div className="relative">
              <IconSearch
                className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                id="catalog-search"
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="Steam, gift card, FIFA…"
                className="pl-8"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-8 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Categoría</Label>
              <Select
                value={filters.category || "all"}
                onValueChange={(value) =>
                  onChange({ category: value === "all" ? "" : value, page: 1 })
                }
                disabled={isLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {options.categories.map((category) => (
                    <SelectItem key={category.id} value={category.slug}>
                      {category.name} ({category.productCount})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Plataforma</Label>
              <Select
                value={filters.platform || "all"}
                onValueChange={(value) =>
                  onChange({ platform: value === "all" ? "" : value, page: 1 })
                }
                disabled={isLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las plataformas</SelectItem>
                  {options.platforms.map((platform) => {
                    const { label } = getPlatformIconConfig(platform);
                    return (
                      <SelectItem key={platform} value={platform}>
                        {label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Ordenar</Label>
              <Select
                value={filters.sort}
                onValueChange={(value) =>
                  onChange({
                    sort: value as CatalogFilters["sort"],
                    page: 1,
                  })
                }
                disabled={isLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATALOG_SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Por página</Label>
              <Select
                value={String(filters.pageSize)}
                onValueChange={(value) =>
                  onChange({
                    pageSize: Number(value) as CatalogFilters["pageSize"],
                    page: 1,
                  })
                }
                disabled={isLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATALOG_PAGE_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size} productos
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-6 border-t border-border/40 pt-4">
          <div className="flex items-center gap-2">
            <Switch
              id="catalog-offers"
              checked={filters.offersOnly}
              onCheckedChange={(checked) =>
                onChange({ offersOnly: checked, page: 1 })
              }
              disabled={isLoading}
            />
            <Label htmlFor="catalog-offers" className="text-sm font-medium cursor-pointer">
              Solo ofertas
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="catalog-preorders"
              checked={filters.preordersOnly}
              onCheckedChange={(checked) =>
                onChange({ preordersOnly: checked, page: 1 })
              }
              disabled={isLoading}
            />
            <Label htmlFor="catalog-preorders" className="text-sm font-medium cursor-pointer">
              Solo preventas
            </Label>
          </div>
        </div>
      </div>
    </div>
  );
}
