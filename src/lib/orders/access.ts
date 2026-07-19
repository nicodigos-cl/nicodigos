import "server-only";

import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

import {
  isOrderAccessTokenFormat,
  orderAccessTokensEqual,
} from "@/lib/orders/access-token";
import prisma from "@/lib/prisma";

export {
  buildOrderAccessPath,
  buildOrderAccessUrl,
  generateOrderAccessToken,
  isOrderAccessTokenFormat,
  orderAccessTokensEqual,
  resolvePresentedAccessToken,
} from "@/lib/orders/access-token";

export const ORDER_ACCESS_COOKIE = "nicodigos_order_access";
const ORDER_ACCESS_MAX_AGE_SECONDS = 60 * 60 * 24 * 90;

function orderAccessCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ORDER_ACCESS_MAX_AGE_SECONDS,
  };
}

function parseOrderAccessCookie(raw: string | undefined): {
  orderId: string;
  token: string;
} | null {
  if (!raw) return null;
  const dot = raw.indexOf(".");
  if (dot <= 0) return null;
  const orderId = raw.slice(0, dot);
  const token = raw.slice(dot + 1);
  if (!orderId || !isOrderAccessTokenFormat(token)) return null;
  return { orderId, token };
}

export async function getOrderAccessTokenFromCookie(
  orderId: string,
): Promise<string | null> {
  const parsed = parseOrderAccessCookie(
    (await cookies()).get(ORDER_ACCESS_COOKIE)?.value,
  );
  if (!parsed || parsed.orderId !== orderId) return null;
  return parsed.token;
}

/** Server Actions only — pages must use `applyOrderAccessCookie` on a NextResponse. */
export async function setOrderAccessCookie(
  orderId: string,
  token: string,
): Promise<void> {
  if (!isOrderAccessTokenFormat(token)) return;
  (await cookies()).set(
    ORDER_ACCESS_COOKIE,
    `${orderId}.${token}`,
    orderAccessCookieOptions(),
  );
}

/** Route Handlers — attach the access cookie to a redirect/response. */
export function applyOrderAccessCookie(
  response: NextResponse,
  orderId: string,
  token: string,
): void {
  if (!isOrderAccessTokenFormat(token)) return;
  response.cookies.set(
    ORDER_ACCESS_COOKIE,
    `${orderId}.${token}`,
    orderAccessCookieOptions(),
  );
}

export async function canAccessOrder(input: {
  orderId: string;
  accessToken?: string | null;
  userId?: string | null;
  role?: string | null;
}): Promise<boolean> {
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    select: { userId: true, accessToken: true },
  });
  if (!order) return false;

  if (input.role === "ADMIN") return true;
  if (input.userId && order.userId === input.userId) return true;
  if (
    input.accessToken &&
    orderAccessTokensEqual(input.accessToken, order.accessToken)
  ) {
    return true;
  }
  return false;
}
