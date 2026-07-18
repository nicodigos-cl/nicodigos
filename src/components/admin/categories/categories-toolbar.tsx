"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  HiChevronDown,
  HiOutlineCollection,
  HiOutlineFilter,
  HiOutlineFolder,
  HiOutlinePlus,
  HiOutlineRefresh,
  HiOutlineSortAscending,
  HiOutlineX,
} from "react-icons/hi";

import { SsrSearchInput } from "@/components/admin/ssr-search-input";
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
import type {
  CategoriesListQuery,
  CategoriesSortField,
} from "@/lib/validations/categories";
import type { CategoryParentOptionDto } from "@/types/categories";

type CategoriesToolbarProps = {
  query: CategoriesListQuery;
  parentOptions: CategoryParentOptionDto[];
};

type FilterOverrides = Partial<{
  q: string | undefined;
  parentId: CategoriesListQuery["parentId"] | undefined;
  sort: CategoriesSortField | undefined;
  order: "asc" | "desc" | undefined;
}>;

const sortOptions: Array<{
  sort: CategoriesSortField;
  order: "asc" | "desc";
  label: string;
}> = [
  { sort: "updatedAt", order: "desc", label: "Más recientes" },
  { sort: "name", order: "asc", label: "Nombre A–Z" },
  { sort: "productsCount", order: "desc", label: "Más productos" },
  { sort: "createdAt", order: "desc", label: "Fecha de creación" },
];

function buildHref(
  query: CategoriesListQuery,
  overrides: FilterOverrides,
): string {
  const next = {
    q: "q" in overrides ? overrides.q : query.q,
    pageSize: query.pageSize,
    parentId: "parentId" in overrides ? overrides.parentId : query.parentId,
    sort: "sort" in overrides ? (overrides.sort ?? "updatedAt") : query.sort,
    order: "order" in overrides ? (overrides.order ?? "desc") : query.order,
  };

  const params = new URLSearchParams();
  if (next.q) params.set("q", next.q);
  if (next.pageSize !== 20) params.set("pageSize", String(next.pageSize));
  if (next.parentId) params.set("parentId", next.parentId);
  if (next.sort !== "updatedAt") params.set("sort", next.sort);
  if (next.order !== "desc") params.set("order", next.order);

  const qs = params.toString();
  return qs ? `/admin/categories?${qs}` : "/admin/categories";
}

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

export function CategoriesToolbar({
  query,
  parentOptions,
}: CategoriesToolbarProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const activeFilterCount = useMemo(
    () =>
      [
        query.parentId,
        query.sort !== "updatedAt" || query.order !== "desc",
      ].filter(Boolean).length,
    [query.order, query.parentId, query.sort],
  );

  const parentLabel = useMemo(() => {
    if (!query.parentId) return null;
    if (query.parentId === "root") return "Solo raíz";
    return (
      parentOptions.find((option) => option.id === query.parentId)?.name ??
      query.parentId
    );
  }, [parentOptions, query.parentId]);

  function apply(overrides: FilterOverrides) {
    router.push(buildHref(query, overrides));
  }

  function clearFilters() {
    router.push(
      buildHref(query, {
        parentId: undefined,
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
            Categorías
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Organiza el catálogo en categorías y subcategorías para filtrar
            productos.
          </p>
        </div>
        <Button
          render={<Link href="/admin/categories/new" />}
          nativeButton={false}
          className="shrink-0"
        >
          <HiOutlinePlus className="size-4" />
          Añadir categoría
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SsrSearchInput
          value={query.q ?? ""}
          buildHref={(q) => buildHref(query, { q })}
          placeholder="Buscar por nombre, slug o descripción..."
          aria-label="Buscar categorías"
          className="w-full max-w-sm sm:w-72"
        />
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
            className="w-[min(100vw-2rem,28rem)] max-w-none gap-0 p-0"
          >
            <PopoverHeader className="flex-row items-start justify-between gap-3 border-b border-border px-4 py-3">
              <div className="space-y-1">
                <PopoverTitle className="flex items-center gap-2 text-sm">
                  <HiOutlineFilter className="size-4 text-primary" />
                  Filtrar categorías
                </PopoverTitle>
                <PopoverDescription className="text-xs">
                  Padre y ordenamiento.
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
            <div className="grid gap-0 sm:grid-cols-2">
              <section className="border-b border-border p-3 sm:border-r sm:border-b-0">
                <div className="mb-2 px-1 text-xs font-medium text-muted-foreground">
                  Padre
                </div>
                <div className="max-h-56 space-y-0.5 overflow-y-auto">
                  <FilterOptionButton
                    active={!query.parentId}
                    label="Todas"
                    icon={HiOutlineCollection}
                    onClick={() => apply({ parentId: undefined })}
                  />
                  <FilterOptionButton
                    active={query.parentId === "root"}
                    label="Solo raíz"
                    icon={HiOutlineFolder}
                    onClick={() => apply({ parentId: "root" })}
                  />
                  {parentOptions.map((option) => (
                    <FilterOptionButton
                      key={option.id}
                      active={query.parentId === option.id}
                      label={option.name}
                      icon={HiOutlineFolder}
                      onClick={() => apply({ parentId: option.id })}
                    />
                  ))}
                </div>
              </section>
              <section className="p-3">
                <div className="mb-2 px-1 text-xs font-medium text-muted-foreground">
                  Ordenar
                </div>
                <div className="space-y-0.5">
                  {sortOptions.map((option) => (
                    <FilterOptionButton
                      key={`${option.sort}-${option.order}`}
                      active={
                        query.sort === option.sort &&
                        query.order === option.order
                      }
                      label={option.label}
                      icon={
                        option.sort === "updatedAt"
                          ? HiOutlineRefresh
                          : HiOutlineSortAscending
                      }
                      onClick={() =>
                        apply({ sort: option.sort, order: option.order })
                      }
                    />
                  ))}
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

        {query.parentId ? (
          <Badge variant="secondary" className="gap-1">
            {parentLabel}
            <button
              type="button"
              aria-label="Quitar filtro de padre"
              className="rounded-full p-0.5 hover:bg-foreground/10"
              onClick={() => apply({ parentId: undefined })}
            >
              <HiOutlineX className="size-3" />
            </button>
          </Badge>
        ) : null}
      </div>
    </div>
  );
}
