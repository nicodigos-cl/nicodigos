import StoreFooter from "@/components/layout/store-footer";
import StoreNav from "@/components/layout/store-nav";
import StoreCategories from "@/components/store/store-categories";
import StoreCTA from "@/components/store/store-cta";
import StoreHero from "@/components/store/store-hero";
import StoreNewProducts from "@/components/store/store-new-products";
import StoreOfferProducts from "@/components/store/store-offer-products";
import { StoreProductBands } from "@/components/store/store-product-bands";
import StorePopularProducts from "@/components/store/store-popular-products";
import StoreTrendingProducts from "@/components/store/store-trending-products";
import { getStoreNavCategories } from "@/lib/categories/queries";
import {
  getNewStoreProducts,
  getOfferStoreProducts,
  getPopularStoreProducts,
  getTrendingStoreProducts,
} from "@/lib/products/queries";

export default async function Home() {
  const [
    categories,
    popularProducts,
    trendingProducts,
    newProducts,
    offerProducts,
  ] = await Promise.all([
    getStoreNavCategories(),
    getPopularStoreProducts(8),
    getTrendingStoreProducts(12),
    getNewStoreProducts(12),
    getOfferStoreProducts(12),
  ]);

  return (
    <div className="min-h-full bg-background">
      <StoreNav />
      <main>
        <StoreHero />
        <StoreProductBands>
          <StoreCategories
            categories={categories.map((category) => ({
              name: category.name,
              href: category.href,
              slug: category.slug,
            }))}
          />
          <StorePopularProducts products={popularProducts} />
        </StoreProductBands>
        <StoreCTA />
        <StoreProductBands>
          <StoreTrendingProducts products={trendingProducts} />
          <StoreNewProducts products={newProducts} />
          <StoreOfferProducts products={offerProducts} />
        </StoreProductBands>
      </main>
      <StoreFooter />
    </div>
  );
}
