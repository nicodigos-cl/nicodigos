import prisma from "@/lib/prisma";
import type { AdminProductListItem } from "@/lib/admin/products/types";

export type AdminProductsResponse = {
  products: AdminProductListItem[];
  total: number;
  page: number;
  totalPages: number;
  stats: {
    total: number;
    active: number;
    drafts: number;
    lowStock: number;
  };
};

export async function getAdminProducts(options: {
  page?: number;
  limit?: number;
  search?: string;
} = {}): Promise<AdminProductsResponse> {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.max(1, options.limit ?? 50);
  const search = options.search?.trim().toLowerCase() ?? "";

  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { platform: { contains: search, mode: "insensitive" } },
      { slug: { contains: search, mode: "insensitive" } },
    ];
    const kinguinIdSearch = parseInt(search);
    if (!isNaN(kinguinIdSearch)) {
      where.OR.push({ kinguinId: kinguinIdSearch });
    }
  }

  // Get global counts (not filtered by search) for the board overview cards
  const [globalTotal, globalActive, globalLowStock] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { isActive: true } }),
    prisma.product.count({ where: { qty: { lt: 5 } } }),
  ]);
  const globalDrafts = globalTotal - globalActive;

  // Get total count matching search
  const total = await prisma.product.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, totalPages);
  const skip = (safePage - 1) * limit;

  const products = await prisma.product.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: limit,
    skip,
    include: {
      _count: { select: { offers: true } },
    },
  });

  const listItems = products.map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    platform: product.platform,
    qty: product.qty,
    sellPrice: product.sellPrice.toString(),
    costPrice: product.costPrice.toString(),
    sourceCostPrice: product.sourceCostPrice?.toString() ?? null,
    sourceCurrency: product.sourceCurrency,
    isActive: product.isActive,
    isOffer: product.isOffer,
    isFeatured: product.isFeatured,
    isPreorder: product.isPreorder,
    kinguinId: product.kinguinId,
    coverImageUrl: product.coverImageUrl,
    offerCount: product._count.offers,
    updatedAt: product.updatedAt.toISOString(),
  }));

  return {
    products: listItems,
    total,
    page: safePage,
    totalPages,
    stats: {
      total: globalTotal,
      active: globalActive,
      drafts: globalDrafts,
      lowStock: globalLowStock,
    },
  };
}

export async function getImportedKinguinIds(
  kinguinIds: number[],
  productIds: string[],
): Promise<{ kinguinIds: Set<number>; productIds: Set<string> }> {
  if (kinguinIds.length === 0 && productIds.length === 0) {
    return { kinguinIds: new Set(), productIds: new Set() };
  }

  const existing = await prisma.product.findMany({
    where: {
      OR: [
        ...(kinguinIds.length > 0 ? [{ kinguinId: { in: kinguinIds } }] : []),
        ...(productIds.length > 0
          ? [{ kinguinProductId: { in: productIds } }]
          : []),
      ],
    },
    select: { kinguinId: true, kinguinProductId: true },
  });

  return {
    kinguinIds: new Set(existing.map((row) => row.kinguinId)),
    productIds: new Set(existing.map((row) => row.kinguinProductId)),
  };
}
