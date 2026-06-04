import prisma from "@/lib/prisma";
import type { AdminProductListItem } from "@/lib/admin/products/types";

export async function getAdminProducts(): Promise<AdminProductListItem[]> {
  const products = await prisma.product.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { offers: true } },
    },
  });

  return products.map((product) => ({
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
