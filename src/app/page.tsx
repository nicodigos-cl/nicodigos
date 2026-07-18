import StoreNav from "@/components/layout/store-nav";
import { StoreCategories } from "@/components/store/store-categories";
import { StoreHero } from "@/components/store/store-hero";
import { StorePopularProducts } from "@/components/store/store-popular-products";
import { getStoreNavCategories } from "@/lib/categories/queries";
import { getPopularStoreProducts } from "@/lib/products/queries";

export default async function Home() {
  const [categories, popularProducts] = await Promise.all([
    getStoreNavCategories(),
    getPopularStoreProducts(8),
  ]);

  return (
    <div className="min-h-full bg-background">
      <StoreNav />
      <main>
        <StoreHero />
        <StoreCategories
          categories={categories.map((category) => ({
            name: category.name,
            href: category.href,
            slug: category.slug,
          }))}
        />
        <StorePopularProducts products={popularProducts} />
      </main>
    </div>
  );
}
