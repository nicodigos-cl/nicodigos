import prisma from "@/lib/prisma";

export async function getOrCreateCart(userId: string) {
  return prisma.cart.upsert({
    where: { userId },
    create: { userId },
    update: {},
    select: { id: true },
  });
}

export async function resolveProductOfferId(productId: string) {
  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      isActive: true,
      qty: { gt: 0 },
    },
    select: {
      id: true,
      offers: {
        where: { qty: { gt: 0 } },
        orderBy: [{ isDefault: "desc" }, { sellPrice: "asc" }],
        take: 1,
        select: { id: true },
      },
    },
  });

  if (!product) {
    return null;
  }

  return product.offers[0]?.id ?? null;
}
