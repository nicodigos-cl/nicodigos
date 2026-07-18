"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  HiChevronDown,
  HiOutlineCheckCircle,
  HiOutlineCollection,
  HiOutlineFilter,
  HiOutlineRefresh,
  HiOutlineX,
} from "react-icons/hi";

import { SyncServicesDialog } from "@/components/admin/smm-services/sync-services-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { ServicesListQuery } from "@/lib/validations/smm-providers";
import type { SmmProviderOptionDto } from "@/types/smm-provider";

type ServicesToolbarProps = {
  query: ServicesListQuery;
  providers: SmmProviderOptionDto[];
  categories: string[];
};

type FilterOverrides = Partial<{
  providerId: string | undefined;
  category: string | undefined;
  isActive: "true" | "false" | undefined;
  sort: ServicesListQuery["sort"] | undefined;
  order: "asc" | "desc" | undefined;
}>;

function buildHref(query: ServicesListQuery, overrides: FilterOverrides) {
  const next = {
    q: query.q,
    pageSize: query.pageSize,
    providerId:
      "providerId" in overrides ? overrides.providerId : query.providerId,
    category: "category" in overrides ? overrides.category : query.category,
    isActive: "isActive" in overrides ? overrides.isActive : query.isActive,
    sort: "sort" in overrides ? (overrides.sort ?? "updatedAt") : query.sort,
    order: "order" in overrides ? (overrides.order ?? "desc") : query.order,
  };

  const params = new URLSearchParams();
  if (next.q) params.set("q", next.q);
  if (next.pageSize !== 20) params.set("pageSize", String(next.pageSize));
  if (next.providerId) params.set("providerId", next.providerId);
  if (next.category) params.set("category", next.category);
  if (next.isActive) params.set("isActive", next.isActive);
  if (next.sort !== "updatedAt") params.set("sort", next.sort);
  if (next.order !== "desc") params.set("order", next.order);

  const qs = params.toString();
  return qs ? `/admin/services?${qs}` : "/admin/services";
}

function FilterOptionButton({
  active,
  label,
  icon: Icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
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
      <Icon className="size-4 shrink-0 opacity-80" />
      <span className="truncate">{label}</span>
    </button>
  );
}

export function ServicesToolbar({
  query,
  providers,
  categories,
}: ServicesToolbarProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const activeFilterCount = useMemo(
    () =>
      [
        query.providerId,
        query.category,
        query.isActive,
        query.sort !== "updatedAt" || query.order !== "desc",
      ].filter(Boolean).length,
    [query.category, query.isActive, query.order, query.providerId, query.sort],
  );

  const selectedProvider = providers.find(
    (provider) => provider.id === query.providerId,
  );

  function apply(overrides: FilterOverrides) {
    router.push(buildHref(query, overrides));
  }

  function clearFilters() {
    router.push(
      buildHref(query, {
        providerId: undefined,
        category: undefined,
        isActive: undefined,
        sort: "updatedAt",
        order: "desc",
      }),
    );
    setOpen(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Servicios SMM
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Catálogo de servicios cacheados desde los paneles. Sincroniza un
            provider para actualizar la lista.
          </p>
        </div>
        <SyncServicesDialog
          providers={providers}
          defaultProviderId={query.providerId}
          triggerClassName="shrink-0"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            render={<Button type="button" variant="outline" size="sm" />}
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
            align="start"
            sideOffset={8}
            className="w-[min(100vw-2rem,36rem)] max-w-none gap-0 p-0"
          >
            <PopoverHeader className="flex-row items-start justify-between gap-3 border-b border-border px-4 py-3">
              <div className="space-y-1">
                <PopoverTitle className="flex items-center gap-2 text-sm">
                  <HiOutlineFilter className="size-4 text-primary" />
                  Filtrar servicios
                </PopoverTitle>
                <PopoverDescription className="text-xs">
                  Provider, categoría, estado y orden.
                </PopoverDescription>
              </div>
              {activeFilterCount > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={clearFilters}
                >
                  <HiOutlineRefresh className="size-3.5" />
                  Limpiar
                </Button>
              ) : null}
            </PopoverHeader>
            <div className="grid gap-0 sm:grid-cols-3">
              <section className="border-b border-border p-3 sm:border-r sm:border-b-0">
                <div className="mb-2 px-1 text-xs font-medium text-muted-foreground">
                  Provider
                </div>
                <div className="max-h-48 space-y-0.5 overflow-y-auto">
                  <FilterOptionButton
                    active={!query.providerId}
                    label="Todos"
                    icon={HiOutlineCollection}
                    onClick={() => apply({ providerId: undefined })}
                  />
                  {providers.map((provider) => (
                    <FilterOptionButton
                      key={provider.id}
                      active={query.providerId === provider.id}
                      label={provider.name}
                      icon={HiOutlineCollection}
                      onClick={() => apply({ providerId: provider.id })}
                    />
                  ))}
                </div>
              </section>
              <section className="border-b border-border p-3 sm:border-r sm:border-b-0">
                <div className="mb-2 px-1 text-xs font-medium text-muted-foreground">
                  Categoría
                </div>
                <div className="max-h-48 space-y-0.5 overflow-y-auto">
                  <FilterOptionButton
                    active={!query.category}
                    label="Todas"
                    icon={HiOutlineCollection}
                    onClick={() => apply({ category: undefined })}
                  />
                  {categories.map((category) => (
                    <FilterOptionButton
                      key={category}
                      active={query.category === category}
                      label={category}
                      icon={HiOutlineCollection}
                      onClick={() => apply({ category })}
                    />
                  ))}
                </div>
              </section>
              <section className="p-3">
                <div className="mb-2 px-1 text-xs font-medium text-muted-foreground">
                  Estado / orden
                </div>
                <div className="space-y-0.5">
                  <FilterOptionButton
                    active={!query.isActive}
                    label="Activos e inactivos"
                    icon={HiOutlineCollection}
                    onClick={() => apply({ isActive: undefined })}
                  />
                  <FilterOptionButton
                    active={query.isActive === "true"}
                    label="Solo activos"
                    icon={HiOutlineCheckCircle}
                    onClick={() => apply({ isActive: "true" })}
                  />
                  <FilterOptionButton
                    active={query.isActive === "false"}
                    label="Solo inactivos"
                    icon={HiOutlineX}
                    onClick={() => apply({ isActive: "false" })}
                  />
                  <Separator className="my-2" />
                  <FilterOptionButton
                    active={
                      query.sort === "updatedAt" && query.order === "desc"
                    }
                    label="Más recientes"
                    icon={HiOutlineRefresh}
                    onClick={() => apply({ sort: "updatedAt", order: "desc" })}
                  />
                  <FilterOptionButton
                    active={query.sort === "name" && query.order === "asc"}
                    label="Nombre A–Z"
                    icon={HiOutlineCollection}
                    onClick={() => apply({ sort: "name", order: "asc" })}
                  />
                  <FilterOptionButton
                    active={query.sort === "category" && query.order === "asc"}
                    label="Categoría A–Z"
                    icon={HiOutlineCollection}
                    onClick={() => apply({ sort: "category", order: "asc" })}
                  />
                </div>
              </section>
            </div>
            <Separator />
            <div className="flex justify-end px-4 py-3">
              <Button type="button" size="sm" onClick={() => setOpen(false)}>
                Listo
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {selectedProvider ? (
          <Badge variant="secondary" className="gap-1">
            {selectedProvider.name}
            <button
              type="button"
              aria-label="Quitar provider"
              className="rounded-full p-0.5 hover:bg-foreground/10"
              onClick={() => apply({ providerId: undefined })}
            >
              <HiOutlineX className="size-3" />
            </button>
          </Badge>
        ) : null}

        {query.category ? (
          <Badge variant="secondary" className="gap-1">
            {query.category}
            <button
              type="button"
              aria-label="Quitar categoría"
              className="rounded-full p-0.5 hover:bg-foreground/10"
              onClick={() => apply({ category: undefined })}
            >
              <HiOutlineX className="size-3" />
            </button>
          </Badge>
        ) : null}

        {query.isActive ? (
          <Badge variant="secondary" className="gap-1">
            {query.isActive === "true" ? "Activos" : "Inactivos"}
            <button
              type="button"
              aria-label="Quitar estado"
              className="rounded-full p-0.5 hover:bg-foreground/10"
              onClick={() => apply({ isActive: undefined })}
            >
              <HiOutlineX className="size-3" />
            </button>
          </Badge>
        ) : null}
      </div>
    </div>
  );
}
