import prisma from "@/lib/prisma";

export type StorefrontCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  bannerUrl: string | null;
  productCount: number;
};

function categoryDescriptionPreview(
  html: string | null,
  maxLength = 120,
): string | null {
  if (!html) {
    return null;
  }

  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) {
    return null;
  }

  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
}

export async function getStorefrontCategories(): Promise<StorefrontCategory[]> {
  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      _count: {
        select: {
          products: {
            where: {
              isActive: true,
              qty: { gt: 0 },
            },
          },
        },
      },
    },
  });

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: categoryDescriptionPreview(category.description),
    imageUrl: category.imageUrl,
    bannerUrl: category.bannerUrl,
    productCount: category._count.products,
  }));
}
