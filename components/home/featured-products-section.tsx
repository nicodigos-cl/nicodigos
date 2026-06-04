import { SectionShell } from "@/components/home/section-shell";
import { StorefrontProductCardView } from "@/components/store/storefront-product-card";
import type { StorefrontProductCard } from "@/lib/store/home/types";
import { storeRoutes } from "@/lib/store/navigation";

type FeaturedProductsSectionProps = {
  products: StorefrontProductCard[];
};

export function FeaturedProductsSection({
  products,
}: FeaturedProductsSectionProps) {
  if (products.length === 0) {
    return null;
  }

  return (
    <SectionShell
      id="destacados"
      eyebrow="Lo bacán del mes"
      title="Productos destacados"
      description="Keys y licencias al tiro, stock chequeado y precios en pesos chilenos."
      href={storeRoutes.catalog}
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
