"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  HiChevronDown,
  HiOutlineArchive,
  HiOutlineCheckCircle,
  HiOutlineCollection,
  HiOutlineDocument,
  HiOutlineDocumentDownload,
  HiOutlineFilter,
  HiOutlineKey,
  HiOutlineLightningBolt,
  HiOutlinePlus,
  HiOutlineRefresh,
  HiOutlineSortAscending,
  HiOutlineTag,
  HiOutlineTruck,
  HiOutlineX,
} from "react-icons/hi";

import { exportFilteredProductsAsJson } from "@/components/admin/products/products-actions-bar";
import { ImportProductsMenu } from "@/components/admin/products/import-products-menu";
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
import type { CategoryOptionDto } from "@/types/products";
import type {
  ProductsListQuery,
  ProductsSortField,
} from "@/lib/validations/products";

type ProductsToolbarProps = {
  query: ProductsListQuery;
  categories: CategoryOptionDto[];
};

type FilterOverrides = Partial<{
  q: string | undefined;
  category: string | undefined;
  status: ProductsListQuery["status"] | undefined;
  deliveryMethod: ProductsListQuery["deliveryMethod"] | undefined;
  sort: ProductsSortField | undefined;
  order: "asc" | "desc" | undefined;
}>;

const statusOptions = [
  {
    value: "all" as const,
    label: "Todos",
    icon: HiOutlineCollection,
  },
  {
    value: "ACTIVE" as const,
    label: "Activo",
    icon: HiOutlineCheckCircle,
  },
  {
    value: "DRAFT" as const,
    label: "Borrador",
    icon: HiOutlineDocument,
  },
  {
    value: "ARCHIVED" as const,
    label: "Archivado",
    icon: HiOutlineArchive,
  },
];

const deliveryOptions = [
  {
    value: "all" as const,
    label: "Todos",
    icon: HiOutlineCollection,
  },
  {
    value: "MANUAL" as const,
    label: "Manual",
    icon: HiOutlineKey,
  },
  {
    value: "KINGUIN" as const,
    label: "Kinguin",
    icon: HiOutlineLightningBolt,
  },
  {
    value: "SMM" as const,
    label: "SMM",
    icon: HiOutlineTruck,
  },
];

const sortOptions: Array<{
  sort: ProductsSortField;
  order: "asc" | "desc";
  label: string;
}> = [
  { sort: "updatedAt", order: "desc", label: "Más recientes" },
  { sort: "name", order: "asc", label: "Nombre A–Z" },
  { sort: "price", order: "desc", label: "Precio mayor" },
  { sort: "price", order: "asc", label: "Precio menor" },
  { sort: "qty", order: "desc", label: "Mayor stock" },
  { sort: "createdAt", order: "desc", label: "Fecha de creación" },
];

function buildHref(
  query: ProductsListQuery,
  overrides: FilterOverrides,
): string {
  const next = {
    q: "q" in overrides ? overrides.q : query.q,
    pageSize: query.pageSize,
    category: "category" in overrides ? overrides.category : query.category,
    status: "status" in overrides ? overrides.status : query.status,
    deliveryMethod:
      "deliveryMethod" in overrides
        ? overrides.deliveryMethod
        : query.deliveryMethod,
    sort: "sort" in overrides ? (overrides.sort ?? "updatedAt") : query.sort,
    order: "order" in overrides ? (overrides.order ?? "desc") : query.order,
  };

  const params = new URLSearchParams();
  if (next.q) params.set("q", next.q);
  if (next.pageSize !== 20) params.set("pageSize", String(next.pageSize));
  if (next.category) params.set("category", next.category);
  if (next.status) params.set("status", next.status);
  if (next.deliveryMethod) params.set("deliveryMethod", next.deliveryMethod);
  if (next.sort !== "updatedAt") params.set("sort", next.sort);
  if (next.order !== "desc") params.set("order", next.order);

  const qs = params.toString();
  return qs ? `/admin/products?${qs}` : "/admin/products";
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

export function ProductsToolbar({ query, categories }: ProductsToolbarProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isExporting, startExport] = useTransition();

  const activeFilterCount = [
    query.category,
    query.status,
    query.deliveryMethod,
    query.sort !== "updatedAt" || query.order !== "desc" ? "sort" : null,
  ].filter(Boolean).length;

  const categoryLabel = useMemo(() => {
    if (!query.category) return null;
    return (
      categories.find((category) => category.slug === query.category)?.name ??
      query.category
    );
  }, [categories, query.category]);

  function apply(overrides: FilterOverrides) {
    router.push(buildHref(query, overrides));
  }

  function clearFilters() {
    router.push(
      buildHref(query, {
        category: undefined,
        status: undefined,
        deliveryMethod: undefined,
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
            Inventario de productos
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Gestiona el catálogo, los precios, la disponibilidad y los códigos
            de activación.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="shrink-0"
            disabled={isExporting || undefined}
            onClick={() => {
              startExport(() => {
                void exportFilteredProductsAsJson(query)();
              });
            }}
          >
            <HiOutlineDocumentDownload className="size-4" />
            {isExporting ? "Exportando..." : "Exportar"}
          </Button>
          <ImportProductsMenu categories={categories} />
          <Button
            render={<Link href="/admin/products/new" />}
            nativeButton={false}
            className="shrink-0"
          >
            <HiOutlinePlus className="size-4" />
            Añadir producto
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SsrSearchInput
          value={query.q ?? ""}
          buildHref={(q) => buildHref(query, { q })}
          placeholder="Buscar por nombre, slug o descripción..."
          aria-label="Buscar productos"
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
            className="w-[min(100vw-2rem,40rem)] max-w-none gap-0 p-0"
          >
            <PopoverHeader className="flex-row items-start justify-between gap-3 border-b border-border px-4 py-3">
              <div className="space-y-1">
                <PopoverTitle className="flex items-center gap-2 text-sm">
                  <HiOutlineFilter className="size-4 text-primary" />
                  Filtrar inventario
                </PopoverTitle>
                <PopoverDescription className="text-xs">
                  Categoría, estado, entrega y ordenamiento.
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

            <div className="grid gap-0 sm:grid-cols-2 lg:grid-cols-4">
              <section className="border-b border-border p-3 sm:border-r lg:border-b-0">
                <div className="mb-2 flex items-center gap-1.5 px-1 text-xs font-medium text-muted-foreground">
                  <HiOutlineTag className="size-3.5" />
                  Categoría
                </div>
                <div className="max-h-56 space-y-0.5 overflow-y-auto">
                  <FilterOptionButton
                    active={!query.category}
                    label="Todas"
                    icon={HiOutlineCollection}
                    onClick={() => apply({ category: undefined })}
                  />
                  {categories.map((category) => (
                    <FilterOptionButton
                      key={category.id}
                      active={query.category === category.slug}
                      label={category.name}
                      icon={HiOutlineTag}
                      onClick={() => apply({ category: category.slug })}
                    />
                  ))}
                  {categories.length === 0 ? (
                    <p className="px-2.5 py-2 text-xs text-muted-foreground">
                      Sin categorías
                    </p>
                  ) : null}
                </div>
              </section>

              <section className="border-b border-border p-3 sm:border-r-0 lg:border-r lg:border-b-0">
                <div className="mb-2 flex items-center gap-1.5 px-1 text-xs font-medium text-muted-foreground">
                  <HiOutlineCheckCircle className="size-3.5" />
                  Estado
                </div>
                <div className="space-y-0.5">
                  {statusOptions.map((option) => (
                    <FilterOptionButton
                      key={option.value}
                      active={
                        option.value === "all"
                          ? !query.status
                          : query.status === option.value
                      }
                      label={option.label}
                      icon={option.icon}
                      onClick={() =>
                        apply({
                          status:
                            option.value === "all" ? undefined : option.value,
                        })
                      }
                    />
                  ))}
                </div>
              </section>

              <section className="border-b border-border p-3 sm:border-r lg:border-b-0">
                <div className="mb-2 flex items-center gap-1.5 px-1 text-xs font-medium text-muted-foreground">
                  <HiOutlineTruck className="size-3.5" />
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
                        apply({
                          deliveryMethod:
                            option.value === "all" ? undefined : option.value,
                        })
                      }
                    />
                  ))}
                </div>
              </section>

              <section className="p-3">
                <div className="mb-2 flex items-center gap-1.5 px-1 text-xs font-medium text-muted-foreground">
                  <HiOutlineSortAscending className="size-3.5" />
                  Ordenar
                </div>
                <div className="space-y-0.5">
                  {sortOptions.map((option) => {
                    const active =
                      query.sort === option.sort &&
                      query.order === option.order;
                    return (
                      <FilterOptionButton
                        key={`${option.sort}-${option.order}`}
                        active={active}
                        label={option.label}
                        icon={HiOutlineSortAscending}
                        onClick={() =>
                          apply({ sort: option.sort, order: option.order })
                        }
                      />
                    );
                  })}
                </div>
              </section>
            </div>

            <Separator />
            <div className="flex items-center justify-between gap-2 px-4 py-3">
              <p className="text-xs text-muted-foreground">
                {activeFilterCount === 0
                  ? "Sin filtros activos"
                  : `${activeFilterCount} filtro${activeFilterCount === 1 ? "" : "s"} activo${activeFilterCount === 1 ? "" : "s"}`}
              </p>
              <Button type="button" size="sm" onClick={() => setOpen(false)}>
                Listo
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {query.category ? (
          <Badge variant="secondary" className="gap-1">
            <HiOutlineTag className="size-3" />
            {categoryLabel}
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

        {query.status ? (
          <Badge variant="secondary" className="gap-1">
            <HiOutlineCheckCircle className="size-3" />
            {statusOptions.find((option) => option.value === query.status)
              ?.label ?? query.status}
            <button
              type="button"
              aria-label="Quitar estado"
              className="rounded-full p-0.5 hover:bg-foreground/10"
              onClick={() => apply({ status: undefined })}
            >
              <HiOutlineX className="size-3" />
            </button>
          </Badge>
        ) : null}

        {query.deliveryMethod ? (
          <Badge variant="secondary" className="gap-1">
            <HiOutlineTruck className="size-3" />
            {deliveryOptions.find(
              (option) => option.value === query.deliveryMethod,
            )?.label ?? query.deliveryMethod}
            <button
              type="button"
              aria-label="Quitar método de entrega"
              className="rounded-full p-0.5 hover:bg-foreground/10"
              onClick={() => apply({ deliveryMethod: undefined })}
            >
              <HiOutlineX className="size-3" />
            </button>
          </Badge>
        ) : null}
      </div>
    </div>
  );
}
