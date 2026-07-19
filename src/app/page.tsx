import StoreNav from "@/components/layout/store-nav";
import StoreCategories from "@/components/store/store-categories";
import StoreCTA from "@/components/store/store-cta";
import { StoreFloatingEmojis } from "@/components/store/store-floating-emojis";
import StoreHero from "@/components/store/store-hero";
import StorePopularProducts from "@/components/store/store-popular-products";
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
        <div className="relative overflow-hidden">
          <StoreFloatingEmojis emojiCount={5} iconCount={7} className="z-20" />
          <div className="relative z-10">
            <StoreCategories
              categories={categories.map((category) => ({
                name: category.name,
                href: category.href,
                slug: category.slug,
              }))}
            />
            <StorePopularProducts products={popularProducts} />
          </div>
        </div>
        <StoreCTA />
      </main>
    </div>
  );
}
