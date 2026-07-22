import StoreLayout from "@/components/layout/store-layout";
import { HomeDeepLink } from "@/components/store/home-deep-link";
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

type HomePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function Home({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const filtro = firstParam(params.filtro)?.toLowerCase();
  const scrollToId =
    filtro === "ofertas" || filtro === "offers" ? "offer-products" : null;

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
    <StoreLayout>
      <HomeDeepLink scrollToId={scrollToId} />
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
      <StoreProductBands>
        <StoreOfferProducts products={offerProducts} />
        <StoreTrendingProducts products={trendingProducts} />
      </StoreProductBands>

      <StoreCTA />

      <StoreProductBands>
        <StoreNewProducts products={newProducts} />
      </StoreProductBands>
    </StoreLayout>
  );
}
