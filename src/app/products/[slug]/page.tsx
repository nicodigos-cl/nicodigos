import type { Metadata } from "next";
import { notFound } from "next/navigation";

import StoreFooter from "@/components/layout/store-footer";
import StoreNav from "@/components/layout/store-nav";
import { StoreProductBands } from "@/components/store/store-product-bands";
import { StoreProductDetail } from "@/components/store/store-product-detail";
import {
  getRelatedStoreProducts,
  getStoreProductBySlug,
} from "@/lib/products/queries";
import {
  JsonLd,
  buildBreadcrumbJsonLd,
  buildProductJsonLd,
} from "@/lib/seo/json-ld";
import { SITE_NAME } from "@/lib/seo/site";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getStoreProductBySlug(slug);

  if (!product) {
    return { title: "Producto no encontrado", robots: { index: false } };
  }

  const description =
    product.description?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160) ||
    `Compra ${product.name} en ${SITE_NAME}. Precio en CLP con entrega digital en Chile.`;

  const image = product.images[0]?.src;

  return {
    title: product.name,
    description,
    alternates: { canonical: product.href },
    openGraph: {
      type: "website",
      title: `${product.name} · ${SITE_NAME}`,
      description,
      url: product.href,
      images: image
        ? [{ url: image, alt: product.images[0]?.alt ?? product.name }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.name} · ${SITE_NAME}`,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getStoreProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const relatedProducts = await getRelatedStoreProducts(
    product.id,
    product.categories.map((category) => category.id),
  );

  const primaryCategory = product.categories[0];
  const breadcrumbs = [
    { name: "Inicio", path: "/" },
    { name: "Catálogo", path: "/catalog" },
    ...(primaryCategory
      ? [
          {
            name: primaryCategory.name,
            path: `/categories/${primaryCategory.slug}`,
          },
        ]
      : []),
    { name: product.name, path: product.href },
  ];

  return (
    <div className="min-h-full bg-background pb-4 lg:pb-0">
      <JsonLd data={buildProductJsonLd(product)} />
      <JsonLd data={buildBreadcrumbJsonLd(breadcrumbs)} />
      <div className="hidden lg:block">
        <StoreNav />
      </div>
      <StoreProductBands>
        <main className="mx-auto max-w-7xl px-4 py-4 sm:py-12 lg:px-8">
          <StoreProductDetail
            product={product}
            relatedProducts={relatedProducts}
          />
        </main>
      </StoreProductBands>
      <div className="hidden lg:block">
        <StoreFooter />
      </div>
    </div>
  );
}
