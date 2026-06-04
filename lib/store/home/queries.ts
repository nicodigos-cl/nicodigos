import type { Prisma } from "@/lib/generated/prisma/client";
import prisma from "@/lib/prisma";
import {
  getStorefrontCategories,
  getStorefrontNavCategories,
} from "@/lib/store/categories/queries";
import { mapStorefrontProductCard } from "@/lib/store/home/map-product";
import type {
  HomePageData,
  StorefrontProductCard,
} from "@/lib/store/home/types";
import { storefrontProductCardSelect } from "@/lib/store/product-card-query";

const HOME_FEATURED_LIMIT = 8;
const HOME_OFFERS_LIMIT = 8;
const HOME_PREORDERS_LIMIT = 6;
const HOME_HERO_LIMIT = 12;

const productCardSelect = storefrontProductCardSelect;

const inStockWhere = {
  isActive: true,
  qty: { gt: 0 },
} as const;

async function findProductCards(
  where: Prisma.ProductWhereInput,
  limit: number,
): Promise<StorefrontProductCard[]> {
  const products = await prisma.product.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }],
    take: limit,
    select: productCardSelect,
  });

  return products.map(mapStorefrontProductCard);
}

async function getHeroProducts(): Promise<StorefrontProductCard[]> {
  const offers = await findProductCards(
    { ...inStockWhere, isOffer: true },
    HOME_HERO_LIMIT,
  );

  if (offers.length > 0) {
    return offers;
  }

  const featured = await findProductCards(
    { ...inStockWhere, isFeatured: true },
    HOME_HERO_LIMIT,
  );

  if (featured.length > 0) {
    return featured;
  }

  return findProductCards(inStockWhere, HOME_HERO_LIMIT);
}

export async function getHomePageData(): Promise<HomePageData> {
  const [
    categories,
    navCategories,
    heroProducts,
    featuredProducts,
    offerProducts,
    preorderProducts,
  ] = await Promise.all([
    getStorefrontCategories(),
    getStorefrontNavCategories(),
    getHeroProducts(),
    findProductCards(
      { ...inStockWhere, isFeatured: true },
      HOME_FEATURED_LIMIT,
    ).then(async (featured) => {
      if (featured.length > 0) {
        return featured;
      }
      return findProductCards(inStockWhere, HOME_FEATURED_LIMIT);
    }),
    findProductCards({ ...inStockWhere, isOffer: true }, HOME_OFFERS_LIMIT),
    prisma.product
      .findMany({
        where: {
          isActive: true,
          isPreorder: true,
        },
        orderBy: [{ releaseDate: "asc" }, { updatedAt: "desc" }],
        take: HOME_PREORDERS_LIMIT,
        select: productCardSelect,
      })
      .then((rows) => rows.map(mapStorefrontProductCard)),
  ]);

  return {
    categories: categories.filter((c) => c.productCount > 0).slice(0, 8),
    navCategories,
    heroProducts,
    featuredProducts,
    offerProducts,
    preorderProducts,
  };
}
