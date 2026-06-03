import prisma from "@/lib/prisma";
import type { CartView, StoreCounts } from "@/lib/store/types";

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

export async function getCartCount(userId: string): Promise<number> {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    select: { _count: { select: { items: true } } },
  });

  return cart?._count.items ?? 0;
}

export async function getCartView(userId: string): Promise<CartView | null> {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        orderBy: { createdAt: "desc" },
        include: {
          product: { select: productSelect },
          offer: {
            select: {
              id: true,
              name: true,
              qty: true,
              sellPrice: true,
            },
          },
        },
      },
    },
  });

  if (!cart) {
    return null;
  }

  let subtotal = 0;

  const items = cart.items.map((item) => {
    const unitPrice = Number(item.offer.sellPrice.toString());
    const lineTotal = unitPrice * item.quantity;
    subtotal += lineTotal;

    return {
      id: item.id,
      quantity: item.quantity,
      unitPrice: item.offer.sellPrice.toString(),
      lineTotal: lineTotal.toFixed(0),
      product: {
        ...item.product,
        sellPrice: item.product.sellPrice.toString(),
      },
      offer: {
        id: item.offer.id,
        name: item.offer.name,
        qty: item.offer.qty,
      },
    };
  });

  return {
    id: cart.id,
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: subtotal.toFixed(0),
  };
}

export async function getStoreCounts(userId: string): Promise<StoreCounts> {
  const [cart, wishlist] = await Promise.all([
    prisma.cart.findUnique({
      where: { userId },
      select: { _count: { select: { items: true } } },
    }),
    prisma.wishlist.findUnique({
      where: { userId },
      select: { _count: { select: { items: true } } },
    }),
  ]);

  return {
    cart: cart?._count.items ?? 0,
    wishlist: wishlist?._count.items ?? 0,
  };
}
