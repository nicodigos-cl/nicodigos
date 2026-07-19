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

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getStoreProductBySlug(slug);

  if (!product) {
    return { title: "Producto no encontrado" };
  }

  return {
    title: `${product.name} · Nicodigos`,
    description:
      product.description?.slice(0, 160) ??
      `${product.name} en Nicodigos. Precio en CLP con entrega digital.`,
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

  return (
    <div className="min-h-full bg-background pb-4 lg:pb-0">
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
