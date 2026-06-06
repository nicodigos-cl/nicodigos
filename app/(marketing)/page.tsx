import type { Metadata } from "next";

import { BenefitsSection } from "@/components/home/benefits-section";
import { CategoriesSection } from "@/components/home/categories-section";
import { CtaSection } from "@/components/home/cta-section";
import { FaqSection } from "@/components/home/faq-section";
import { FeaturedProductsSection } from "@/components/home/featured-products-section";
import HeroSection from "@/components/home/hero-section";
import { HowItWorksSection } from "@/components/home/how-it-works-section";
import { OffersSection } from "@/components/home/offers-section";
import { PreordersSection } from "@/components/home/preorders-section";
// import { ReviewsSection } from "@/components/home/reviews-section";
import { resolveHomeSeoMetadata } from "@/lib/seo/home";
import { getHomePageData } from "@/lib/store/home/queries";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  return resolveHomeSeoMetadata(null);
}

export default async function HomePage() {
  const data = await getHomePageData();
  const hasOffers = data.heroProducts.some((p) => p.isOffer);

  return (
    <main className="flex-1 relative overflow-hidden bg-background">
      <HeroSection products={data.heroProducts} hasOffers={hasOffers} />
      <CategoriesSection categories={data.categories} />
      <BenefitsSection />
      <FeaturedProductsSection products={data.featuredProducts} />
      <OffersSection products={data.offerProducts} />
      {/* <ReviewsSection /> */}
      <HowItWorksSection />
      <PreordersSection products={data.preorderProducts} />
      <FaqSection />
      <CtaSection />
    </main>
  );
}
