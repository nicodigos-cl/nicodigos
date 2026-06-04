"use client";

import { useCallback, useMemo, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { IconLoader2 } from "@tabler/icons-react";

import { CatalogFiltersBar } from "@/components/store/catalog-filters";
import { CatalogPaginationClient } from "@/components/store/catalog-pagination-client";
import { CatalogProductSkeleton } from "@/components/store/catalog-product-skeleton";
import {
  StorefrontProductCardView,
  storefrontProductGridClassName,
} from "@/components/store/storefront-product-card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { fetchCatalogAction } from "@/lib/store/catalog/actions";
import {
  areCatalogFiltersEqual,
  catalogFiltersKey,
  catalogFiltersToQueryString,
  parseCatalogSearchParams,
} from "@/lib/store/catalog/url";
import type {
  CatalogFilterOptions,
  CatalogFilters,
  CatalogPageResult,
} from "@/lib/store/catalog/types";
import { cn } from "@/lib/utils";

type CatalogExplorerProps = {
  initialFilters: CatalogFilters;
  initialData: CatalogPageResult;
  filterOptions: CatalogFilterOptions;
};

function hasActiveCatalogFilters(filters: CatalogFilters): boolean {
  return Boolean(
    filters.q ||
    filters.category ||
    filters.platform ||
    filters.genre ||
    filters.tag ||
    filters.minPrice ||
    filters.maxPrice ||
    filters.offersOnly ||
    filters.preordersOnly ||
    filters.sort !== "newest",
  );
}

export function CatalogExplorer({
  initialFilters,
  initialData,
  filterOptions,
}: CatalogExplorerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const filters = useMemo(
    () => parseCatalogSearchParams(Object.fromEntries(searchParams.entries())),
    [searchParams],
  );

  const { data, isFetching, isPending, isPlaceholderData } = useQuery({
    queryKey: ["catalog", catalogFiltersKey(filters)],
    queryFn: () => fetchCatalogAction(filters),
    initialData: areCatalogFiltersEqual(filters, initialFilters)
      ? initialData
      : undefined,
    placeholderData: (previousData) => previousData,
  });

  const result = data ?? initialData;
  const isLoadingGrid = isFetching && (isPending || isPlaceholderData);

  const rangeStart =
    result.total === 0 ? 0 : (result.page - 1) * result.pageSize + 1;
  const rangeEnd =
    result.total === 0
      ? 0
      : Math.min(result.page * result.pageSize, result.total);

  const pushFilters = useCallback(
    (next: CatalogFilters) => {
      const query = catalogFiltersToQueryString(next);
      startTransition(() => {
        router.replace(`${pathname}${query}`, { scroll: false });
      });
    },
    [pathname, router],
  );

  const patchFilters = useCallback(
    (patch: Partial<CatalogFilters>) => {
      pushFilters({ ...filters, ...patch });
    },
    [filters, pushFilters],
  );

  const resetFilters = useCallback(() => {
    pushFilters({
      q: "",
      category: "",
      platform: "",
      genre: "",
      tag: "",
      minPrice: "",
      maxPrice: "",
      offersOnly: false,
      preordersOnly: false,
      sort: "newest",
      page: 1,
      pageSize: filters.pageSize,
    });
  }, [filters.pageSize, pushFilters]);

  return (
    <div className="space-y-6">
      <CatalogFiltersBar
        filters={filters}
        options={filterOptions}
        onChange={patchFilters}
        onReset={resetFilters}
        hasActiveFilters={
          hasActiveCatalogFilters(filters) ||
          filters.pageSize !== initialFilters.pageSize
        }
        isLoading={isFetching}
      />

      {result.total > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/10 pb-4">
          <p className="text-xs font-medium text-muted-foreground">
            Mostrando{" "}
            <span className="font-semibold text-foreground">
              {rangeStart}–{rangeEnd}
            </span>{" "}
            de{" "}
            <span className="font-semibold text-foreground">
              {result.total}
            </span>{" "}
            productos
          </p>
          {isFetching ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
              <IconLoader2 className="size-3.5 animate-spin" aria-hidden />
              Actualizando…
            </span>
          ) : null}
        </div>
      ) : null}

      {isLoadingGrid && result.products.length === 0 ? (
        <CatalogProductSkeleton count={filters.pageSize} />
      ) : result.products.length === 0 ? (
        <Empty className="border-dashed bg-muted/5 py-16">
          <EmptyHeader>
            <EmptyTitle className="text-base font-bold">
              No encontramos nada
            </EmptyTitle>
            <EmptyDescription className="text-sm">
              Prueba con otra búsqueda o limpia los filtros pa&apos; ver más
              productos.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="relative">
          <ul
            className={cn(
              cn(
                storefrontProductGridClassName,
                "transition-opacity duration-200",
              ),
              isLoadingGrid && "opacity-50 pointer-events-none",
            )}
          >
            {result.products.map((product) => (
              <li key={product.id} className="h-full">
                <StorefrontProductCardView product={product} />
              </li>
            ))}
          </ul>
          {isLoadingGrid ? (
            <div
              className="pointer-events-none absolute inset-0 flex items-start justify-center pt-24"
              aria-live="polite"
              aria-busy="true"
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/90 px-4 py-2 text-sm font-medium shadow-md backdrop-blur-sm">
                <IconLoader2 className="size-4 animate-spin text-primary" />
                Cargando productos…
              </span>
            </div>
          ) : null}
        </div>
      )}

      <CatalogPaginationClient
        filters={result.filters}
        page={result.page}
        totalPages={result.totalPages}
        onPageChange={(page) => patchFilters({ page })}
        isLoading={isFetching}
      />
    </div>
  );
}
