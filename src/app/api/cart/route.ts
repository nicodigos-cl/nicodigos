import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { getCurrentCart } from "@/lib/cart/current";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();

  const cart = await getCurrentCart(session?.user.id);

  return NextResponse.json({
    cart,
    authenticated: Boolean(session?.user),
  });
}
