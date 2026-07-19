"use client";

import StoreProductCarousel from "@/components/store/store-product-carousel";
import type { StoreProductCardDto } from "@/types/products";

type StoreTrendingProductsProps = {
  products: StoreProductCardDto[];
  className?: string;
};

export default function StoreTrendingProducts({
  products,
  className,
}: StoreTrendingProductsProps) {
  return (
    <StoreProductCarousel
      id="trending-products"
      tone="trending"
      eyebrow="Tendencia"
      title="Productos en tendencia"
      description="Lo que más se está pidiendo ahora mismo en Nicodigos."
      href="/catalog"
      ctaLabel="Ver tendencias"
      products={products}
      badgeMode="auto"
      className={className}
    />
  );
}
