import { SectionShell } from "@/components/home/section-shell";
import { StorefrontProductCardView } from "@/components/store/storefront-product-card";
import type { StorefrontProductCard } from "@/lib/store/home/types";
import { storeRoutes } from "@/lib/store/navigation";

type OffersSectionProps = {
  products: StorefrontProductCard[];
};

export function OffersSection({ products }: OffersSectionProps) {
  if (products.length === 0) {
    return null;
  }

  return (
    <SectionShell
      id="ofertas"
      eyebrow="Promociones"
      title="Productos en oferta"
      description="Precios especiales en juegos y software con stock limitado."
      href={storeRoutes.offers}
      className="py-16 sm:py-20"
    >
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => (
          <li key={product.id}>
            <StorefrontProductCardView product={product} />
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}
