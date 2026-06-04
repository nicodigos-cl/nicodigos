import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IconCategory, IconChevronRight } from "@tabler/icons-react";

import { StorePagination } from "@/components/store/catalog-pagination";
import { StorefrontProductCardView } from "@/components/store/storefront-product-card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { resolveCategorySeoMetadata } from "@/lib/seo/category";
import {
  getStorefrontCategoryBySlug,
  getStorefrontCategoryProductsPage,
} from "@/lib/store/categories/queries";
import { storeRoutes } from "@/lib/store/navigation";

export const revalidate = 300;

type CategoryPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
};

function parsePageParam(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export async function generateMetadata({
  params,
  searchParams,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const page = parsePageParam(pageParam);
  const category = await getStorefrontCategoryBySlug(slug);

  if (!category) {
    return { title: "Categoría no encontrada" };
  }

  const metadata = resolveCategorySeoMetadata(category, category.seoMetadata);

  if (page > 1) {
    return {
      ...metadata,
      title: `${category.name} — Página ${page}`,
    };
  }

  return metadata;
}

export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const requestedPage = parsePageParam(pageParam);

  const category = await getStorefrontCategoryBySlug(slug);

  if (!category) {
    notFound();
  }

  const productsPage = await getStorefrontCategoryProductsPage(
    slug,
    requestedPage,
  );

  if (!productsPage) {
    notFound();
  }

  const { products, page, total, totalPages, pageSize } = productsPage;
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(page * pageSize, total);
  const categoryPath = storeRoutes.category(slug);

  return (
    <main className="flex-1 relative overflow-hidden bg-background">
      <div className="absolute inset-0 admin-dashboard-grid opacity-20 pointer-events-none" />
      <div className="absolute top-[-10%] left-[-10%] -z-10 h-[550px] w-[550px] rounded-full bg-violet-500/10 blur-[130px] pointer-events-none" />
      <div className="absolute top-[30%] right-[-10%] -z-10 h-[450px] w-[450px] rounded-full bg-indigo-500/10 blur-[110px] pointer-events-none" />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 relative z-10 space-y-8">
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm text-muted-foreground/80 bg-muted/20 w-fit px-3.5 py-1.5 rounded-full border border-border/40 backdrop-blur-sm"
        >
          <Link
            href={storeRoutes.categories}
            className="hover:text-foreground transition-colors font-medium"
          >
            Categorías
          </Link>
          <IconChevronRight
            className="size-3.5 shrink-0 text-muted-foreground/50"
            aria-hidden
          />
          <span className="line-clamp-1 text-foreground font-semibold">
            {category.name}
          </span>
        </nav>

        <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-r from-card via-indigo-500/5 to-card shadow-lg">
          <div className="relative aspect-[21/7] min-h-[180px] sm:min-h-[220px] overflow-hidden bg-muted/20">
            {category.bannerUrl || category.imageUrl ? (
              <Image
                src={category.bannerUrl ?? category.imageUrl!}
                alt=""
                fill
                unoptimized
                priority
                sizes="(max-width:1280px) 100vw, 1280px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/10 via-muted to-indigo-500/10">
                <IconCategory className="size-16 text-primary/30" aria-hidden />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          </div>

          <div className="relative z-10 flex flex-col gap-4 p-6 sm:p-8 md:flex-row md:items-end md:justify-between">
            <div className="flex items-start gap-4 min-w-0">
              {category.imageUrl ? (
                <div className="relative size-14 sm:size-16 shrink-0 overflow-hidden rounded-2xl border border-border bg-background shadow-md -mt-12 sm:-mt-14">
                  <Image
                    src={category.imageUrl}
                    alt=""
                    fill
                    unoptimized
                    sizes="64px"
                    className="object-cover"
                  />
                </div>
              ) : null}
              <div className="space-y-2 min-w-0">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-500 border border-indigo-500/20">
                  <IconCategory className="size-3.5" />
                  Categoría
                </div>
                <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
                  {category.name}
                </h1>
                {category.descriptionPreview ? (
                  <p className="text-sm text-muted-foreground/90 max-w-2xl leading-relaxed line-clamp-3">
                    {category.descriptionPreview}
                  </p>
                ) : null}
              </div>
            </div>

            {total > 0 ? (
              <div className="flex flex-col items-start md:items-end justify-center shrink-0 bg-background/60 backdrop-blur-md border border-border/40 rounded-2xl p-4 shadow-sm min-w-[160px]">
                <span className="text-2xl font-black text-indigo-500 tabular-nums">
                  {total}
                </span>
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                  {total === 1 ? "Producto" : "Productos"}
                </span>
              </div>
            ) : null}
          </div>
        </div>

        {category.description ? (
          <div
            className="product-description max-w-none text-sm leading-relaxed text-muted-foreground/90 rounded-2xl border border-border/50 bg-muted/10 p-6 [&_h2]:mb-2.5 [&_h2]:mt-5 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-foreground [&_li]:mb-1.5 [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-5"
            dangerouslySetInnerHTML={{ __html: category.description }}
          />
        ) : null}

        {total > 0 ? (
          <div className="flex items-center justify-between border-b border-border/10 pb-4">
            <p className="text-xs text-muted-foreground font-medium">
              Mostrando{" "}
              <span className="text-foreground font-semibold">
                {rangeStart}–{rangeEnd}
              </span>{" "}
              de <span className="text-foreground font-semibold">{total}</span>{" "}
              productos en {category.name}
            </p>
          </div>
        ) : null}

        {products.length === 0 ? (
          <Empty className="py-16 border-dashed bg-muted/5">
            <EmptyHeader>
              <EmptyTitle className="text-base font-bold">
                Sin productos en esta categoría
              </EmptyTitle>
              <EmptyDescription className="text-sm">
                No hay productos con stock en {category.name} por ahora. Explora
                el catálogo completo o otras categorías.
              </EmptyDescription>
            </EmptyHeader>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href={storeRoutes.catalog}
                className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Ver catálogo
              </Link>
              <Link
                href={storeRoutes.categories}
                className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Todas las categorías
              </Link>
            </div>
          </Empty>
        ) : (
          <>
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <li key={product.id} className="h-full">
                  <StorefrontProductCardView product={product} />
                </li>
              ))}
            </ul>

            <StorePagination
              page={page}
              totalPages={totalPages}
              basePath={categoryPath}
            />
          </>
        )}
      </div>
    </main>
  );
}
