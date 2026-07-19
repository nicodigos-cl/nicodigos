import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { mintOrderWsTicket } from "@/lib/order-live/ticket";
import {
  canAccessOrder,
  getOrderAccessTokenFromCookie,
  isOrderAccessTokenFormat,
} from "@/lib/orders/access";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ orderId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
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

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, userId: true, email: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isAdmin = session?.user?.role === "ADMIN";

  try {
    const minted = mintOrderWsTicket({
      userId: session?.user?.id ?? order.userId,
      email: session?.user?.email ?? order.email,
      orderId: order.id,
      role: isAdmin ? "ADMIN" : "USER",
    });

    // Same live gateway as support chat (e.g. wss://ws.nicodigos.cl/ws).
    const wsBase =
      process.env.NEXT_PUBLIC_SUPPORT_WS_URL?.trim() ||
      "ws://127.0.0.1:3011/ws";

    return NextResponse.json({
      ok: true,
      ticket: minted.ticket,
      expiresAt: minted.expiresAt,
      wsUrl: `${wsBase}${wsBase.includes("?") ? "&" : "?"}ticket=${encodeURIComponent(minted.ticket)}`,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "WebSocket no configurado (SUPPORT_WS_SECRET)" },
      { status: 503 },
    );
  }
}
