"use client";

import Link from "next/link";
import { useCallback, useMemo, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { IconLoader2 } from "@tabler/icons-react";

import { CategoryPaginationClient } from "@/components/store/category/category-pagination-client";
import { CategoryToolbar } from "@/components/store/category/category-toolbar";
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
import { fetchCategoryProductsAction } from "@/lib/store/category/actions";
import type { CategoryProductsFilters } from "@/lib/store/category/types";
import {
  areCategoryFiltersEqual,
  categoryFiltersKey,
  categoryFiltersToQueryString,
  parseCategorySearchParams,
} from "@/lib/store/category/url";
import type { StorefrontCategoryDetail } from "@/lib/store/categories/queries";
import type { StorefrontProductCardsPage } from "@/lib/store/home/types";
import { storeRoutes } from "@/lib/store/navigation";
import { cn } from "@/lib/utils";

type CategoryProductsExplorerProps = {
  category: StorefrontCategoryDetail;
  initialFilters: CategoryProductsFilters;
  initialData: StorefrontProductCardsPage;
};

export function CategoryProductsExplorer({
  category,
  initialFilters,
  initialData,
}: CategoryProductsExplorerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const filters = useMemo(
    () => parseCategorySearchParams(Object.fromEntries(searchParams.entries())),
    [searchParams],
  );

  const { data, isFetching, isPending, isPlaceholderData } = useQuery({
    queryKey: ["category-products", category.slug, categoryFiltersKey(filters)],
    queryFn: async (): Promise<StorefrontProductCardsPage> => {
      const page = await fetchCategoryProductsAction(category.slug, filters);
      if (!page) {
        throw new Error(`Category products unavailable for ${category.slug}`);
      }
      return page;
    },
    initialData: areCategoryFiltersEqual(filters, initialFilters)
      ? initialData
      : undefined,
    placeholderData: (previousData) => previousData,
  });

  const result: StorefrontProductCardsPage = data ?? initialData;
  const isLoadingGrid = isFetching && (isPending || isPlaceholderData);

  const rangeStart =
    result.total === 0 ? 0 : (result.page - 1) * result.pageSize + 1;
  const rangeEnd =
    result.total === 0
      ? 0
      : Math.min(result.page * result.pageSize, result.total);

  const basePath = storeRoutes.category(category.slug);

  const pushFilters = useCallback(
    (next: CategoryProductsFilters) => {
      const query = categoryFiltersToQueryString(next);
      startTransition(() => {
        router.replace(`${pathname}${query}`, { scroll: false });
      });
    },
    [pathname, router],
  );

  const patchFilters = useCallback(
    (patch: Partial<CategoryProductsFilters>) => {
      pushFilters({ ...filters, ...patch });
    },
    [filters, pushFilters],
  );

  return (
    <div className="space-y-6">
      <CategoryToolbar
        categorySlug={category.slug}
        categoryName={category.name}
        filters={filters}
        onChange={patchFilters}
        isLoading={isLoadingGrid}
      />

      {result.total > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/10 pb-4">
          <p className="text-xs text-muted-foreground font-medium">
            Mostrando{" "}
            <span className="text-foreground font-semibold">
              {rangeStart}–{rangeEnd}
            </span>{" "}
            de{" "}
            <span className="text-foreground font-semibold">
              {result.total}
            </span>{" "}
            keys en {category.name}
          </p>
          {isLoadingGrid ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <IconLoader2 className="size-3.5 animate-spin" aria-hidden />
              Actualizando…
            </span>
          ) : null}
        </div>
      ) : null}

      {result.products.length === 0 ? (
        <Empty className="py-16 border-dashed bg-muted/5">
          <EmptyHeader>
            <EmptyTitle className="text-base font-bold">
              Por ahora no hay stock acá
            </EmptyTitle>
            <EmptyDescription className="text-sm">
              No tenemos keys con stock en {category.name} en este momento. Mira
              el catálogo completo u otras categorías — capaz encuentras la
              misma onda.
            </EmptyDescription>
          </EmptyHeader>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href={storeRoutes.catalog}
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Ir al catálogo
            </Link>
            <Link
              href={storeRoutes.categories}
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Ver todas las categorías
            </Link>
          </div>
        </Empty>
      ) : (
        <>
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
                  Cargando keys…
                </span>
              </div>
            ) : null}
          </div>

          <CategoryPaginationClient
            basePath={basePath}
            filters={filters}
            page={result.page}
            totalPages={result.totalPages}
            onPageChange={(page) => patchFilters({ page })}
            isLoading={isLoadingGrid}
          />
        </>
      )}
    </div>
  );
}
