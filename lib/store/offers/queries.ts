import prisma from "@/lib/prisma";
import {
  CATALOG_PAGE_SIZE,
  type StorefrontProduct,
  type StorefrontProductsPage,
} from "@/lib/store/products";

export const OFFERS_PAGE_SIZE = CATALOG_PAGE_SIZE;

const storefrontOfferWhere = {
  isActive: true,
  isOffer: true,
  qty: { gt: 0 },
} as const;

const storefrontOfferSelect = {
  id: true,
  slug: true,
  name: true,
  platform: true,
  coverImageUrl: true,
  sellPrice: true,
} as const;

function mapOfferProduct(product: {
  id: string;
  slug: string;
  name: string;
  platform: string;
  coverImageUrl: string | null;
  sellPrice: { toString(): string };
}): StorefrontProduct {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    platform: product.platform,
    coverImageUrl: product.coverImageUrl,
    sellPrice: product.sellPrice.toString(),
  };
}

export async function getStorefrontOffersPage(
  page = 1,
  pageSize = OFFERS_PAGE_SIZE,
): Promise<StorefrontProductsPage> {
  const total = await prisma.product.count({ where: storefrontOfferWhere });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const skip = (safePage - 1) * pageSize;

  const products = await prisma.product.findMany({
    where: storefrontOfferWhere,
    orderBy: [{ updatedAt: "desc" }],
    take: pageSize,
    skip,
    select: storefrontOfferSelect,
  });

  return {
    products: products.map(mapOfferProduct),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}
