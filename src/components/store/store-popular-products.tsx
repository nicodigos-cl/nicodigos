import { StoreProductCard } from "@/components/store/store-product-card";
import { cn } from "@/lib/utils";
import type { StoreProductCardDto } from "@/types/products";

type StorePopularProductsProps = {
  products: StoreProductCardDto[];
  className?: string;
};

export default function StorePopularProducts({
  products,
  className,
}: StorePopularProductsProps) {
  if (products.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="popular-products-heading"
      className={cn("relative", className)}
    >
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2
              id="popular-products-heading"
              className="font-heading text-xl font-bold tracking-tight text-foreground sm:text-3xl"
            >
              Productos populares
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Destacados y más pedidos de Nicodigos.
            </p>
          </div>
        </div>

        <ul className="mt-4 grid list-none grid-cols-2 gap-x-3 gap-y-6 sm:mt-8 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-10 lg:grid-cols-4 xl:gap-x-8">
          {products.map((product) => (
            <li key={product.id}>
              <StoreProductCard product={product} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
