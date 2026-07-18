import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { mintSupportWsTicket } from "@/lib/support-live/ticket";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const role = session.user.role === "ADMIN" ? "ADMIN" : "USER";
    const { ticket, expiresAt } = mintSupportWsTicket({
      userId: session.user.id,
      email: session.user.email,
      name: session.user.name || session.user.email,
      role,
    });

    return NextResponse.json({
      ticket,
      expiresAt,
      wsUrl: process.env.NEXT_PUBLIC_SUPPORT_WS_URL?.trim() || "ws://127.0.0.1:3011/ws",
      role,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ticket unavailable";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
