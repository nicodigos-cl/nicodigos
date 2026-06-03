"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { requireStoreUser } from "@/lib/store/auth";
import {
  getOrCreateCart,
  resolveProductOfferId,
} from "@/lib/store/cart/helpers";
import { storeRoutes } from "@/lib/store/navigation";
import type { StoreActionResult } from "@/lib/store/types";

function revalidateStorePaths() {
  revalidatePath(storeRoutes.cart);
  revalidatePath(storeRoutes.wishlist);
  revalidatePath(storeRoutes.checkoutReturn);
  revalidatePath("/");
}

async function requireCartItemOwner(itemId: string, userId: string) {
  return prisma.cartItem.findFirst({
    where: { id: itemId, cart: { userId } },
    select: { id: true, quantity: true, offerId: true, productId: true },
  });
}

export async function addToCartAction(
  productId: string,
  quantity = 1,
): Promise<StoreActionResult> {
  const session = await requireStoreUser(storeRoutes.cart);

  if (!productId.trim()) {
    return { success: false, error: "Producto no válido." };
  }

  const safeQty = Math.min(Math.max(Math.floor(quantity), 1), 10);
  const offerId = await resolveProductOfferId(productId);

  if (!offerId) {
    return { success: false, error: "Este producto no está disponible." };
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
      productId,
      offerId,
      quantity: safeQty,
    },
    update: {
      quantity: { increment: safeQty },
    },
  });

  revalidateStorePaths();

  return { success: true, message: "Producto agregado al carrito." };
}

export async function updateCartItemQuantityAction(
  itemId: string,
  quantity: number,
): Promise<StoreActionResult> {
  const session = await requireStoreUser(storeRoutes.cart);
  const item = await requireCartItemOwner(itemId, session.user.id);

  if (!item) {
    return { success: false, error: "Ítem no encontrado en tu carrito." };
  }

  const safeQty = Math.floor(quantity);

  if (safeQty <= 0) {
    await prisma.cartItem.delete({ where: { id: itemId } });
    revalidateStorePaths();
    return { success: true, message: "Producto eliminado del carrito." };
  }

  if (safeQty > 10) {
    return { success: false, error: "Máximo 10 unidades por producto." };
  }

  await prisma.cartItem.update({
    where: { id: itemId },
    data: { quantity: safeQty },
  });

  revalidateStorePaths();
  return { success: true };
}

export async function removeCartItemAction(
  itemId: string,
): Promise<StoreActionResult> {
  const session = await requireStoreUser(storeRoutes.cart);
  const item = await requireCartItemOwner(itemId, session.user.id);

  if (!item) {
    return { success: false, error: "Ítem no encontrado en tu carrito." };
  }

  await prisma.cartItem.delete({ where: { id: itemId } });
  revalidateStorePaths();
  return { success: true, message: "Producto eliminado del carrito." };
}

export async function clearCartAction(): Promise<StoreActionResult> {
  const session = await requireStoreUser(storeRoutes.cart);
  const cart = await prisma.cart.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (cart) {
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  }

  revalidateStorePaths();
  return { success: true, message: "Carrito vaciado." };
}

export async function moveCartItemToWishlistAction(
  itemId: string,
): Promise<StoreActionResult> {
  const session = await requireStoreUser(storeRoutes.cart);
  const item = await requireCartItemOwner(itemId, session.user.id);

  if (!item) {
    return { success: false, error: "Ítem no encontrado en tu carrito." };
  }

  const { getOrCreateWishlist } = await import("@/lib/store/wishlist/helpers");
  const wishlist = await getOrCreateWishlist(session.user.id);

  await prisma.$transaction([
    prisma.wishlistItem.upsert({
      where: {
        wishlistId_productId: {
          wishlistId: wishlist.id,
          productId: item.productId,
        },
      },
      create: {
        wishlistId: wishlist.id,
        productId: item.productId,
      },
      update: {},
    }),
    prisma.cartItem.delete({ where: { id: itemId } }),
  ]);

  revalidateStorePaths();
  return { success: true, message: "Movido a tu lista de deseos." };
}
