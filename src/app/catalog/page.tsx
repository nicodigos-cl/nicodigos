import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { HiOutlineCollection } from "react-icons/hi";

import StoreLayout from "@/components/layout/store-layout";
import { CatalogCategoryChips } from "@/components/store/catalog/catalog-category-chips";
import { CatalogPagination } from "@/components/store/catalog/catalog-pagination";
import { CatalogToolbar } from "@/components/store/catalog/catalog-toolbar";
import { StoreProductBands } from "@/components/store/store-product-bands";
import { StoreProductCard } from "@/components/store/store-product-card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { FlickeringGrid } from "@/components/ui/flickering-grid";
import { Button } from "@/components/ui/button";
import {
  buildCatalogHref,
  catalogHasActiveFilters,
} from "@/lib/catalog/url";
import {
  getCategoryBySlug,
  getStoreNavCategories,
} from "@/lib/categories/queries";
import {
  getStoreCatalogPage,
  getStoreCatalogPriceBounds,
} from "@/lib/products/queries";
import { storeCatalogQuerySchema } from "@/lib/validations/catalog";
import { parseSearchParamsRecord } from "@/lib/validations/products";

export const metadata: Metadata = {
  title: "Catálogo",
  description:
    "Explora keys digitales, software y servicios SMM en Chile. Filtra por categoría, precio, disponibilidad y método de entrega. Precios en CLP.",
  alternates: { canonical: "/catalog" },
  openGraph: {
    title: "Catálogo · Nicodigos",
    description:
      "Catálogo de productos digitales y servicios SMM con entrega Manual, SMM y Kinguin.",
    url: "/catalog",
  },
};

type CatalogPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const rawParams = parseSearchParamsRecord(await searchParams);
  const parsed = storeCatalogQuerySchema.safeParse(rawParams);

  if (!parsed.success) {
    redirect("/catalog");
  }

  const query = parsed.data;

  const [categories, priceBounds, result, activeCategory] = await Promise.all([
    getStoreNavCategories(),
    getStoreCatalogPriceBounds(),
    getStoreCatalogPage(query),
    query.category
      ? getCategoryBySlug(query.category)
      : Promise.resolve(null),
  ]);

  if (result.total > 0 && query.page > result.totalPages) {
    redirect(buildCatalogHref(query, { page: result.totalPages }));
  }

  const hasFilters = catalogHasActiveFilters(query);
  const isEmpty = result.total === 0 && !hasFilters;
  const isFilteredEmpty = result.total === 0 && hasFilters;

  return (
    <StoreLayout>
      <StoreProductBands>
        <div className="relative overflow-hidden border-b border-border/40">
          <FlickeringGrid
            className="absolute inset-0 z-0 opacity-[0.35] [mask-image:radial-gradient(ellipse_at_center,white,transparent_75%)]"
            squareSize={3}
            gridGap={5}
            flickerChance={0.12}
            color="rgb(120, 120, 120)"
            maxOpacity={0.18}
          />
          <div className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
            <Breadcrumb className="mb-4">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink render={<Link href="/" />}>
                    Inicio
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {activeCategory ? (
                    <BreadcrumbLink render={<Link href="/catalog" />}>
                      Catálogo
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>Catálogo</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
                {activeCategory ? (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{activeCategory.name}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                ) : null}
                {query.offers && !activeCategory ? (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>Ofertas</BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                ) : null}
              </BreadcrumbList>
            </Breadcrumb>

            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-widest text-primary">
                Tienda
              </p>
              <h1 className="mt-1 font-heading text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                {activeCategory
                  ? activeCategory.name
                  : query.offers
                    ? "Ofertas"
                    : "Catálogo"}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                {activeCategory
                  ? `Productos en ${activeCategory.name}. Filtra por precio, disponibilidad y entrega.`
                  : "Keys, software y servicios SMM con precios en CLP y entrega digital."}
              </p>
            </div>

            <div className="mt-6 sm:mt-8">
              <CatalogCategoryChips categories={categories} query={query} />
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
          <CatalogToolbar
            query={query}
            categories={categories}
            priceBounds={priceBounds}
            total={result.total}
            categoryName={activeCategory?.name}
          />

          <div className="mt-6 sm:mt-8">
            {isEmpty ? (
              <Empty className="border border-border bg-card/60">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <HiOutlineCollection className="size-5" />
                  </EmptyMedia>
                  <EmptyTitle>Catálogo vacío</EmptyTitle>
                  <EmptyDescription>
                    Aún no hay productos publicados. Vuelve pronto.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : isFilteredEmpty ? (
              <Empty className="border border-border bg-card/60">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <HiOutlineCollection className="size-5" />
                  </EmptyMedia>
                  <EmptyTitle>Sin resultados</EmptyTitle>
                  <EmptyDescription>
                    No encontramos productos con esos filtros. Prueba ampliar
                    el rango de precio o quitar algún filtro.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button
                    render={<Link href="/catalog" />}
                    nativeButton={false}
                    variant="outline"
                  >
                    Limpiar filtros
                  </Button>
                </EmptyContent>
              </Empty>
            ) : (
              <>
                <ul className="grid list-none grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-10 lg:grid-cols-3 xl:grid-cols-4 xl:gap-x-8">
                  {result.items.map((product, index) => (
                    <li key={product.id}>
                      <StoreProductCard
                        product={product}
                        priority={index < 4}
                      />
                    </li>
                  ))}
                </ul>

                <div className="mt-8 sm:mt-10">
                  <CatalogPagination
                    page={result.page}
                    pageSize={result.pageSize}
                    total={result.total}
                    totalPages={result.totalPages}
                    query={query}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </StoreProductBands>
    </StoreLayout>
  );
}
