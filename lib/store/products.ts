import prisma from "@/lib/prisma";

export const CATALOG_PAGE_SIZE = 24;

export type StorefrontProduct = {
  id: string;
  slug: string;
  name: string;
  platform: string;
  coverImageUrl: string | null;
  sellPrice: string;
};

export type StorefrontProductsPage = {
  products: StorefrontProduct[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const storefrontProductSelect = {
  id: true,
  slug: true,
  name: true,
  platform: true,
  coverImageUrl: true,
  sellPrice: true,
} as const;

const storefrontProductWhere = {
  isActive: true,
  qty: { gt: 0 },
} as const;

function mapStorefrontProduct(product: {
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

export async function getStorefrontProducts(
  limit = 16,
): Promise<StorefrontProduct[]> {
  const products = await prisma.product.findMany({
    where: storefrontProductWhere,
    orderBy: [{ updatedAt: "desc" }],
    take: limit,
    select: storefrontProductSelect,
  });

  return products.map(mapStorefrontProduct);
}

/** Carrusel de la home: productos con `isFeatured`, o los más recientes si no hay ninguno. */
export async function getStorefrontFeaturedProducts(
  limit = 16,
): Promise<StorefrontProduct[]> {
  const featuredWhere = {
    ...storefrontProductWhere,
    isFeatured: true,
  };

  const featured = await prisma.product.findMany({
    where: featuredWhere,
    orderBy: [{ updatedAt: "desc" }],
    take: limit,
    select: storefrontProductSelect,
  });

  if (featured.length > 0) {
    return featured.map(mapStorefrontProduct);
  }

  return getStorefrontProducts(limit);
}

export async function getStorefrontProductsPage(
  page = 1,
  pageSize = CATALOG_PAGE_SIZE,
): Promise<StorefrontProductsPage> {
  const total = await prisma.product.count({ where: storefrontProductWhere });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const skip = (safePage - 1) * pageSize;

  const products = await prisma.product.findMany({
    where: storefrontProductWhere,
    orderBy: [{ updatedAt: "desc" }],
    take: pageSize,
    skip,
    select: storefrontProductSelect,
  });

  return {
    products: products.map(mapStorefrontProduct),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}
