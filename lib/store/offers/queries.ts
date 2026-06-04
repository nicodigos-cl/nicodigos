import prisma from "@/lib/prisma";
import { CATALOG_PAGE_SIZE } from "@/lib/store/products";
import { mapStorefrontProductCard } from "@/lib/store/home/map-product";
import type { StorefrontProductCardsPage } from "@/lib/store/home/types";
import { storefrontProductCardSelect } from "@/lib/store/product-card-query";

export const OFFERS_PAGE_SIZE = CATALOG_PAGE_SIZE;

const storefrontOfferWhere = {
  isActive: true,
  isOffer: true,
  qty: { gt: 0 },
} as const;

export async function getStorefrontOffersPage(
  page = 1,
  pageSize = OFFERS_PAGE_SIZE,
): Promise<StorefrontProductCardsPage> {
  const total = await prisma.product.count({ where: storefrontOfferWhere });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const skip = (safePage - 1) * pageSize;

  const products = await prisma.product.findMany({
    where: storefrontOfferWhere,
    orderBy: [{ updatedAt: "desc" }],
    take: pageSize,
    skip,
    select: storefrontProductCardSelect,
  });

  return {
    products: products.map((row) =>
      mapStorefrontProductCard(
        row as Parameters<typeof mapStorefrontProductCard>[0],
      ),
    ),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}
