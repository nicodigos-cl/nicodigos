import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";

import { getCartById } from "@/lib/cart/queries";
import prisma from "@/lib/prisma";

const GUEST_CART_COOKIE = "nicodigos_guest_cart";
const GUEST_CART_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function hashGuestToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function guestCartIdFromCookie() {
  const token = (await cookies()).get(GUEST_CART_COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;

  const cart = await prisma.cart.findUnique({
    where: { guestTokenHash: hashGuestToken(token) },
    select: { id: true },
  });
  return cart?.id ?? null;
}

export async function getCurrentCartId(userId?: string | null) {
  const guestCartId = await guestCartIdFromCookie();
  if (guestCartId) return guestCartId;
  if (!userId) return null;

  const cart = await prisma.cart.findUnique({
    where: { userId },
    select: { id: true },
  });
  return cart?.id ?? null;
}

export async function getCurrentCart(userId?: string | null) {
  const cartId = await getCurrentCartId(userId);
  return cartId ? getCartById(cartId) : null;
}

export async function ensureCurrentCart(userId?: string | null) {
  const currentId = await getCurrentCartId(userId);
  if (currentId) return currentId;

  if (userId) {
    const cart = await prisma.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
      select: { id: true },
    });
    return cart.id;
  }

  const token = randomBytes(32).toString("hex");
  const cart = await prisma.cart.create({
    data: { guestTokenHash: hashGuestToken(token) },
    select: { id: true },
  });

  (await cookies()).set(GUEST_CART_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: GUEST_CART_MAX_AGE_SECONDS,
  });

  return cart.id;
}

export async function clearGuestCartCookie() {
  (await cookies()).delete(GUEST_CART_COOKIE);
}
