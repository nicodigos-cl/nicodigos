import prisma from "@/lib/prisma";
import type { WishlistView } from "@/lib/store/types";

const productSelect = {
  id: true,
  slug: true,
  name: true,
  platform: true,
  coverImageUrl: true,
  sellPrice: true,
  qty: true,
  isActive: true,
} as const;

export async function getWishlistCount(userId: string): Promise<number> {
  const wishlist = await prisma.wishlist.findUnique({
    where: { userId },
    select: { _count: { select: { items: true } } },
  });

  return wishlist?._count.items ?? 0;
}

export async function getWishlistView(
  userId: string,
): Promise<WishlistView | null> {
  const wishlist = await prisma.wishlist.findUnique({
    where: { userId },
    include: {
      items: {
        orderBy: { createdAt: "desc" },
        include: {
          product: { select: productSelect },
        },
      },
    },
  });

  if (!wishlist) {
    return null;
  }

  return {
    id: wishlist.id,
    itemCount: wishlist.items.length,
    items: wishlist.items.map((item) => ({
      id: item.id,
      addedAt: item.createdAt.toISOString(),
      product: {
        ...item.product,
        sellPrice: item.product.sellPrice.toString(),
      },
    })),
  };
}

export async function isProductInWishlist(
  userId: string,
  productId: string,
): Promise<boolean> {
  const item = await prisma.wishlistItem.findFirst({
    where: {
      productId,
      wishlist: { userId },
    },
    select: { id: true },
  });

  return Boolean(item);
}
