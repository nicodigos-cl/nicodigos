import type { Metadata } from "next";
import Link from "next/link";

import { ProductStoreActions } from "@/components/store/product-store-actions";
import { StoreProductCover } from "@/components/store/store-product-cover";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/currency/format";
import { storeRoutes } from "@/lib/store/navigation";
import { getStorefrontProducts } from "@/lib/store/products";

export const metadata: Metadata = {
  title: "Catálogo",
};

export const revalidate = 300;

export default async function CatalogPage() {
  const products = await getStorefrontProducts(48);

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 space-y-2">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
            Catálogo
          </h1>
          <p className="text-muted-foreground">
            Keys, gift cards, licencias y suscripciones disponibles en Chile.
          </p>
        </div>

        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay productos publicados todavía.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <li key={product.id}>
                <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                  <Link href={storeRoutes.product(product.slug)}>
                    <StoreProductCover
                      src={product.coverImageUrl}
                      alt={product.name}
                      className="aspect-16/10 w-full rounded-none"
                      sizes="(max-width:640px) 100vw, 280px"
                    />
                  </Link>
                  <div className="flex flex-1 flex-col gap-3 p-4">
                    <Badge variant="secondary" className="w-fit">
                      {product.platform}
                    </Badge>
                    <Link
                      href={storeRoutes.product(product.slug)}
                      className="line-clamp-2 text-sm font-semibold text-foreground hover:text-primary"
                    >
                      {product.name}
                    </Link>
                    <p className="text-sm font-semibold text-foreground">
                      {formatMoney(product.sellPrice)}
                    </p>
                    <ProductStoreActions
                      productId={product.id}
                      className="mt-auto"
                      compact
                    />
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
