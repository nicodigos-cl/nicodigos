import { redirect } from "next/navigation";

import { CheckoutOrderStatusClient } from "@/components/store/checkout-order-status-client";
import { getSession } from "@/lib/auth/session";
import { getOrderLiveSnapshot } from "@/lib/order-live/status";
import {
  canAccessOrder,
  getOrderAccessTokenFromCookie,
  isOrderAccessTokenFormat,
} from "@/lib/orders/access";
import { getOrderById } from "@/lib/orders/queries";

type PageProps = {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CheckoutOrderPage({
  params,
  searchParams,
}: PageProps) {
  const { orderId } = await params;
  const query = await searchParams;
  const queryToken = firstParam(query.s)?.trim() || null;
  const cookieToken = await getOrderAccessTokenFromCookie(orderId);

  // Pages cannot set cookies — claim via Route Handler when landing with ?s=.
  if (
    queryToken &&
    isOrderAccessTokenFormat(queryToken) &&
    queryToken !== cookieToken
  ) {
    const tokenMatches = await canAccessOrder({
      orderId,
      accessToken: queryToken,
    });
    if (tokenMatches) {
      redirect(
        `/api/orders/${encodeURIComponent(orderId)}/claim-access?s=${encodeURIComponent(queryToken)}`,
      );
    }
  }

  const presentedToken =
    queryToken && isOrderAccessTokenFormat(queryToken)
      ? queryToken
      : cookieToken;

  const session = await getSession();
  const allowed = await canAccessOrder({
    orderId,
    accessToken: presentedToken,
    userId: session?.user?.id,
    role: session?.user?.role,
  });

  if (!allowed) {
    if (!session?.user) {
      const next = `/checkout/${encodeURIComponent(orderId)}`;
      redirect(`/auth/login?next=${encodeURIComponent(next)}`);
    }
    redirect("/cart");
  }

  const [order, snapshot] = await Promise.all([
    getOrderById(orderId),
    getOrderLiveSnapshot(orderId),
  ]);

  if (!order || !snapshot) {
    redirect("/cart");
  }

  return (
    <CheckoutOrderStatusClient order={order} initialSnapshot={snapshot} />
  );
}
