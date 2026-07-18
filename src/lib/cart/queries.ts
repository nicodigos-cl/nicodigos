import "server-only";

import prisma from "@/lib/prisma";
import { decimalToString } from "@/lib/products/format";
import type { CartDto, CartLineDto } from "@/types/orders";

function toCartLine(item: {
  id: string;
  productId: string;
  quantity: number;
  product: {
    name: string;
    slug: string;
    price: { toString(): string };
    currency: string;
    coverImageUrl: string | null;
    qty: number;
    status: "DRAFT" | "ACTIVE" | "ARCHIVED";
    assets: Array<{ url: string; thumbnailUrl: string | null }>;
  };
}): CartLineDto {
  const unitPrice = decimalToString(item.product.price) ?? "0";
  const lineTotal = (Number.parseFloat(unitPrice) * item.quantity).toFixed(2);
  const cover =
    item.product.coverImageUrl ??
    item.product.assets[0]?.thumbnailUrl ??
    item.product.assets[0]?.url ??
    null;

  return {
    id: item.id,
    productId: item.productId,
    quantity: item.quantity,
    productName: item.product.name,
    productSlug: item.product.slug,
    unitPrice,
    currency: item.product.currency,
    coverImageUrl: cover,
    lineTotal,
    inStock: item.product.status === "ACTIVE" && item.product.qty > 0,
  };
}

export async function getCartForUser(userId: string): Promise<CartDto | null> {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    select: {
      id: true,
      items: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          productId: true,
          quantity: true,
          product: {
            select: {
              name: true,
              slug: true,
              price: true,
              currency: true,
              coverImageUrl: true,
              qty: true,
              status: true,
              assets: {
                where: { type: "IMAGE" },
                orderBy: { sortOrder: "asc" },
                take: 1,
                select: { url: true, thumbnailUrl: true },
              },
            },
          },
        },
      },
    },
  });

  if (!cart) {
    return null;
  }

  const items = cart.items.map(toCartLine);
  const currency = items[0]?.currency ?? "CLP";
  const subtotal = items
    .reduce((sum, item) => sum + Number.parseFloat(item.lineTotal), 0)
    .toFixed(2);

  return {
    id: cart.id,
    items,
    subtotal,
    currency,
    itemsCount: items.reduce((sum, item) => sum + item.quantity, 0),
  };
}

export async function ensureCartForUser(userId: string): Promise<string> {
  const existing = await prisma.cart.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (existing) {
    return existing.id;
  }

  const created = await prisma.cart.create({
    data: { userId },
    select: { id: true },
  });

  return created.id;
}
