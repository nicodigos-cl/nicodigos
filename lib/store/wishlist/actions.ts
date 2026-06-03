"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { requireStoreUser } from "@/lib/store/auth";
import {
  getOrCreateCart,
  resolveProductOfferId,
} from "@/lib/store/cart/helpers";
import { getOrCreateWishlist } from "@/lib/store/wishlist/helpers";
import type { StoreActionResult } from "@/lib/store/types";

function revalidateStorePaths() {
  revalidatePath("/carrito");
  revalidatePath("/lista-deseos");
  revalidatePath("/");
}

export async function toggleWishlistAction(
  productId: string,
): Promise<StoreActionResult<{ inWishlist: boolean }>> {
  const session = await requireStoreUser("/lista-deseos");

  if (!productId.trim()) {
    return { success: false, error: "Producto no válido." };
  }

  const product = await prisma.product.findFirst({
    where: { id: productId, isActive: true },
    select: { id: true },
  });

  if (!product) {
    return { success: false, error: "Producto no disponible." };
  }

  const wishlist = await getOrCreateWishlist(session.user.id);
  const existing = await prisma.wishlistItem.findUnique({
    where: {
      wishlistId_productId: {
        wishlistId: wishlist.id,
        productId,
      },
    },
    select: { id: true },
  });

  if (existing) {
    await prisma.wishlistItem.delete({ where: { id: existing.id } });
    revalidateStorePaths();
    return {
      success: true,
      data: { inWishlist: false },
      message: "Eliminado de tu lista de deseos.",
    };
  }

  await prisma.wishlistItem.create({
    data: {
      wishlistId: wishlist.id,
      productId,
    },
  });

  revalidateStorePaths();
  return {
    success: true,
    data: { inWishlist: true },
    message: "Agregado a tu lista de deseos.",
  };
}

export async function removeWishlistItemAction(
  itemId: string,
): Promise<StoreActionResult> {
  const session = await requireStoreUser("/lista-deseos");

  const item = await prisma.wishlistItem.findFirst({
    where: { id: itemId, wishlist: { userId: session.user.id } },
    select: { id: true },
  });

  if (!item) {
    return { success: false, error: "Ítem no encontrado en tu lista." };
  }

  await prisma.wishlistItem.delete({ where: { id: itemId } });
  revalidateStorePaths();
  return { success: true, message: "Eliminado de tu lista de deseos." };
}

export async function addWishlistItemToCartAction(
  itemId: string,
): Promise<StoreActionResult> {
  const session = await requireStoreUser("/lista-deseos");

  const item = await prisma.wishlistItem.findFirst({
    where: { id: itemId, wishlist: { userId: session.user.id } },
    select: { productId: true },
  });

  if (!item) {
    return { success: false, error: "Ítem no encontrado en tu lista." };
  }

  const offerId = await resolveProductOfferId(item.productId);

  if (!offerId) {
    return { success: false, error: "Este producto ya no está disponible." };
  }

  const cart = await getOrCreateCart(session.user.id);

  await prisma.cartItem.upsert({
    where: {
      cartId_offerId: {
        cartId: cart.id,
        offerId,
      },
    },
    create: {
      cartId: cart.id,
      productId: item.productId,
      offerId,
      quantity: 1,
    },
    update: {
      quantity: { increment: 1 },
    },
  });

  revalidateStorePaths();
  return { success: true, message: "Producto agregado al carrito." };
}

export async function clearWishlistAction(): Promise<StoreActionResult> {
  const session = await requireStoreUser("/lista-deseos");
  const wishlist = await prisma.wishlist.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (wishlist) {
    await prisma.wishlistItem.deleteMany({
      where: { wishlistId: wishlist.id },
    });
  }

  revalidateStorePaths();
  return { success: true, message: "Lista de deseos vaciada." };
}
