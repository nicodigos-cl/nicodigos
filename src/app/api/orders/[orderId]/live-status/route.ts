import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { getOrderLiveSnapshot } from "@/lib/order-live/status";
import {
  canAccessOrder,
  getOrderAccessTokenFromCookie,
  isOrderAccessTokenFormat,
} from "@/lib/orders/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ orderId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { orderId } = await context.params;
  const session = await getSession();
  const queryToken = new URL(request.url).searchParams.get("s")?.trim() || null;
  const cookieToken = await getOrderAccessTokenFromCookie(orderId);
  const presentedToken =
    queryToken && isOrderAccessTokenFormat(queryToken)
      ? queryToken
      : cookieToken;

  const allowed = await canAccessOrder({
    orderId,
    accessToken: presentedToken,
    userId: session?.user?.id,
    role: session?.user?.role,
  });

  if (!allowed) {
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const snapshot = await getOrderLiveSnapshot(orderId);
  if (!snapshot) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, snapshot });
}
