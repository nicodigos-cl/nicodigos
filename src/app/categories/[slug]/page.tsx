import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HiOutlineCollection, HiChevronRight } from "react-icons/hi";

import StoreLayout from "@/components/layout/store-layout";
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
import { FlickeringGrid } from "@/components/ui/flickering-grid";
import { getStoreCategoryDetail } from "@/lib/categories/queries";
import { getStoreCatalogPage } from "@/lib/products/queries";
import { JsonLd, buildBreadcrumbJsonLd } from "@/lib/seo/json-ld";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getStoreCategoryDetail(slug);

  if (!category) {
    return { title: "Categoría no encontrada", robots: { index: false } };
  }

  const description =
    category.description?.slice(0, 160) ??
    `Explora ${category.name} en Nicodigos: productos digitales y servicios SMM en Chile, precios en CLP.`;
  const path = `/categories/${category.slug}`;
  const image = category.imageUrl ?? undefined;

  return {
    title: category.name,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: `${category.name} · Nicodigos`,
      description,
      url: path,
      images: image ? [{ url: image, alt: category.name }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${category.name} · Nicodigos`,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function CategoryDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const category = await getStoreCategoryDetail(slug);

  if (!category) {
    notFound();
  }

  // Fetch the first page of products belonging to this category and its descendants
  const catalogResult = await getStoreCatalogPage({
    category: category.slug,
    page: 1,
    pageSize: 12,
    sort: "relevance",
    order: "desc",
    q: undefined,
    deliveryMethod: undefined,
    availability: undefined,
    minPrice: undefined,
    maxPrice: undefined,
    offers: undefined,
  });

  return (
    <StoreLayout>
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: "Inicio", path: "/" },
          { name: "Categorías", path: "/categories" },
          ...(category.parent
            ? [
                {
                  name: category.parent.name,
                  path: `/categories/${category.parent.slug}`,
                },
              ]
            : []),
          {
            name: category.name,
            path: `/categories/${category.slug}`,
          },
        ])}
      />
      <div className="w-full">
        {/* ========================================================================= */}
        {/* Category Hero Banner */}
        {/* ========================================================================= */}
        <div className="relative overflow-hidden border-b border-border/40 bg-background/50">
          {category.imageUrl ? (
            <div className="absolute inset-0 z-0">
              <Image
                src={category.imageUrl}
                alt=""
                fill
                priority
                unoptimized
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/85 to-background/50" />
            </div>
          ) : (
            <FlickeringGrid
              className="absolute inset-0 z-0 opacity-[0.25] [mask-image:radial-gradient(ellipse_at_center,white,transparent_75%)]"
              squareSize={3}
              gridGap={5}
              flickerChance={0.12}
              color="rgb(120, 120, 120)"
              maxOpacity={0.18}
            />
          )}

          <div className="relative z-10 mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <Breadcrumb className="mb-4">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink render={<Link href="/" />}>
                    Inicio
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink render={<Link href="/categories" />}>
                    Categorías
                  </BreadcrumbLink>
                </BreadcrumbItem>
                
                {category.parent && (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbLink render={<Link href={`/categories/${category.parent.slug}`} />}>
                        {category.parent.name}
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                  </>
                )}

                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{category.name}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-widest text-primary">
                Colección
              </p>
              <h1 className="mt-1 font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">
                {category.name}
              </h1>
              {category.description && (
                <p className="mt-2 text-sm text-muted-foreground sm:text-base leading-relaxed">
                  {category.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* Subcategories (if any) */}
        {/* ========================================================================= */}
        {category.children && category.children.length > 0 && (
          <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
            <div className="border-b border-border/40 pb-6">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
                Subcategorías de {category.name}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {category.children.map((subcat) => (
                  <Link
                    key={subcat.id}
                    href={`/categories/${subcat.slug}`}
                    className="group relative h-28 rounded-xl overflow-hidden border border-border/40 hover:border-primary/30 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-end p-4 bg-muted"
                  >
                    {subcat.imageUrl ? (
                      <Image
                        src={subcat.imageUrl}
                        alt={subcat.name}
                        fill
                        unoptimized
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 768px) 50vw, 25vw"
                      />
                    ) : (
                      <div className="size-full bg-gradient-to-tr from-muted to-background" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
                    <div className="relative z-10 text-white">
                      <h3 className="text-xs font-bold tracking-tight group-hover:text-primary transition-colors">
                        {subcat.name}
                      </h3>
                      <p className="text-[9px] text-white/70 mt-0.5 font-semibold">
                        {subcat.productsCount} {subcat.productsCount === 1 ? "producto" : "productos"}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* Category Products */}
        {/* ========================================================================= */}
        <StoreProductBands>
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  Productos en {category.name}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Mostrando los productos más relevantes de esta colección
                </p>
              </div>
              <Link
                href={`/catalog?category=${category.slug}`}
                className="text-xs font-bold text-primary hover:text-primary/80 inline-flex items-center gap-0.5"
              >
                Ver filtros avanzados
                <HiChevronRight className="size-4" />
              </Link>
            </div>

            {catalogResult.items.length > 0 ? (
              <div className="space-y-10">
                <ul className="grid list-none grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-10 lg:grid-cols-3 xl:grid-cols-4 xl:gap-x-8">
                  {catalogResult.items.map((product, index) => (
                    <li key={product.id}>
                      <StoreProductCard product={product} priority={index < 4} />
                    </li>
                  ))}
                </ul>

                {catalogResult.total > 12 && (
                  <div className="flex justify-center pt-4">
                    <Link
                      href={`/catalog?category=${category.slug}`}
                      className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-xs font-bold text-primary-foreground shadow-md hover:bg-primary/95 transition-all duration-200 active:scale-95 gap-1.5"
                    >
                      Ver todos los {catalogResult.total} productos de {category.name}
                      <HiChevronRight className="size-4" />
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center border border-dashed border-border/40 rounded-2xl bg-muted/10">
                <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <HiOutlineCollection className="size-6" />
                </div>
                <h3 className="text-sm font-bold text-foreground">No hay productos en esta categoría</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  Aún no hemos cargado productos en la categoría &ldquo;{category.name}&rdquo;. Por favor, vuelve a consultar más tarde.
                </p>
                <Link
                  href="/catalog"
                  className="mt-6 inline-flex items-center justify-center rounded-xl border border-border px-5 py-2.5 text-xs font-bold text-foreground hover:bg-muted/80 transition-all active:scale-95"
                >
                  Explorar todo el catálogo
                </Link>
              </div>
            )}
          </div>
        </StoreProductBands>
      </div>
    </StoreLayout>
  );
}
