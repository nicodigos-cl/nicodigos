import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { getCartForUser } from "@/lib/cart/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();

  if (!session?.user) {
    return NextResponse.json({ cart: null, authenticated: false });
  }

  const cart = await getCartForUser(session.user.id);

  return NextResponse.json({
    cart,
    authenticated: true,
  });
}
