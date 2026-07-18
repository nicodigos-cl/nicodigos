import StoreNav from "@/components/layout/store-nav";
import { StoreHero } from "@/components/store/store-hero";
import { getStoreNavCategories } from "@/lib/categories/queries";

export default async function Home() {
  const categories = await getStoreNavCategories();

  return (
    <div className="min-h-full bg-background">
      <StoreNav />
      <main>
        <StoreHero
          categories={categories.map((category) => ({
            name: category.name,
            href: category.href,
            slug: category.slug,
          }))}
        />
      </main>
    </div>
  );
}
