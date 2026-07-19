import { NextResponse } from "next/server";

import { getAppBaseUrl } from "@/lib/flow/client";
import {
  applyOrderAccessCookie,
  canAccessOrder,
  isOrderAccessTokenFormat,
} from "@/lib/orders/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ orderId: string }>;
};

/**
 * Claims guest order access from `?s=` and sets the HTTP-only cookie.
 * Pages cannot mutate cookies; email/deep links land here first when needed.
 */
export async function GET(request: Request, context: RouteContext) {
  const { orderId } = await context.params;
  const url = new URL(request.url);
  const accessToken = url.searchParams.get("s")?.trim() || null;
  const baseUrl = getAppBaseUrl();
  const checkoutPath = `/checkout/${encodeURIComponent(orderId)}`;

  if (!accessToken || !isOrderAccessTokenFormat(accessToken)) {
    return NextResponse.redirect(new URL(checkoutPath, baseUrl));
  }

  const allowed = await canAccessOrder({ orderId, accessToken });
  if (!allowed) {
    return NextResponse.redirect(new URL("/cart", baseUrl));
  }

  const response = NextResponse.redirect(new URL(checkoutPath, baseUrl));
  applyOrderAccessCookie(response, orderId, accessToken);
  return response;
}
