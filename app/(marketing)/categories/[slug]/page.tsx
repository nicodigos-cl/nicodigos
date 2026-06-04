import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";

import { CategoryDescription } from "@/components/store/category/category-description";
import { CategoryHero } from "@/components/store/category/category-hero";
import { CategoryProductsExplorer } from "@/components/store/category/category-products-explorer";
import { CatalogProductSkeleton } from "@/components/store/catalog-product-skeleton";
import { resolveCategorySeoMetadata } from "@/lib/seo/category";
import { parseCategorySearchParams } from "@/lib/store/category/url";
import {
  getStorefrontCategoryBySlug,
  getStorefrontCategoryProductsPage,
} from "@/lib/store/categories/queries";

export const revalidate = 300;

type CategoryPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({
  params,
  searchParams,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const filters = parseCategorySearchParams(await searchParams);
  const category = await getStorefrontCategoryBySlug(slug);

  if (!category) {
    return { title: "Categoría no encontrada" };
  }

  const metadata = resolveCategorySeoMetadata(category, category.seoMetadata);
  const canonicalPath =
    filters.page > 1
      ? `/categories/${slug}?page=${filters.page}`
      : `/categories/${slug}`;

  return {
    ...metadata,
    title:
      filters.page > 1
        ? `${category.name} — Página ${filters.page}`
        : metadata.title,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      ...metadata.openGraph,
      title:
        filters.page > 1
          ? `${category.name} — Página ${filters.page}`
          : metadata.openGraph?.title,
      url: canonicalPath,
    },
    twitter: {
      ...metadata.twitter,
      title:
        filters.page > 1
          ? `${category.name} — Página ${filters.page}`
          : metadata.twitter?.title,
    },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const { slug } = await params;
  const urlParams = await searchParams;
  const filters = parseCategorySearchParams(urlParams);

  const category = await getStorefrontCategoryBySlug(slug);

  if (!category) {
    notFound();
  }

  const initialData = await getStorefrontCategoryProductsPage(slug, filters);

  if (!initialData) {
    notFound();
  }

  return (
    <main className="flex-1 relative overflow-hidden bg-background">
      <div className="absolute inset-0 admin-dashboard-grid opacity-20 pointer-events-none" />
      <div className="absolute top-[-10%] left-[-10%] -z-10 h-[500px] w-[500px] rounded-full bg-primary/10 blur-[130px] pointer-events-none" />
      <div className="absolute top-[30%] right-[-10%] -z-10 h-[400px] w-[400px] rounded-full bg-indigo-500/10 blur-[110px] pointer-events-none" />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 relative z-10 space-y-8">
        <CategoryHero
          category={category}
          productTotal={category.productCount}
        />

        {category.description ? (
          <CategoryDescription html={category.description} />
        ) : null}

        <Suspense
          fallback={
            <div className="space-y-6">
              <div className="h-28 rounded-2xl border border-border/60 bg-card/80 animate-pulse" />
              <CatalogProductSkeleton count={12} />
            </div>
          }
        >
          <CategoryProductsExplorer
            category={category}
            initialFilters={filters}
            initialData={initialData}
          />
        </Suspense>
      </div>
    </main>
  );
}
