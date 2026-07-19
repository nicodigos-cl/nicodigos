"use client";

import StoreProductCarousel from "@/components/store/store-product-carousel";
import type { StoreProductCardDto } from "@/types/products";

type StoreOfferProductsProps = {
  products: StoreProductCardDto[];
  className?: string;
};

export default function StoreOfferProducts({
  products,
  className,
}: StoreOfferProductsProps) {
  return (
    <StoreProductCarousel
      id="offer-products"
      tone="offers"
      eyebrow="Promociones"
      title="Ofertas destacadas"
      description="Precios especiales por tiempo limitado. Aprovecha antes que se agoten."
      href="/?filtro=ofertas"
      ctaLabel="Ver todas las ofertas"
      products={products}
      badgeMode="offer"
      className={className}
    />
  );
}
