"use client";

import StoreProductCarousel from "@/components/store/store-product-carousel";
import type { StoreProductCardDto } from "@/types/products";

type StoreNewProductsProps = {
  products: StoreProductCardDto[];
  className?: string;
};

export default function StoreNewProducts({
  products,
  className,
}: StoreNewProductsProps) {
  return (
    <StoreProductCarousel
      id="new-products"
      tone="new"
      eyebrow="Novedades"
      title="Recién llegados"
      description="Lo último en keys, software y servicios digitales."
      href="/categorias"
      ctaLabel="Ver novedades"
      products={products}
      badgeMode="new"
      className={className}
    />
  );
}
