import { redirect } from "next/navigation";

import { CheckoutOrderStatusClient } from "@/components/store/checkout-order-status-client";
import { getSession } from "@/lib/auth/session";
import { getOrderLiveSnapshot } from "@/lib/order-live/status";
import { getOrderById } from "@/lib/orders/queries";

type PageProps = {
  params: Promise<{ orderId: string }>;
};

export default async function CheckoutOrderPage({ params }: PageProps) {
  const { orderId } = await params;
  const session = await getSession();
  if (!session?.user) {
    redirect(`/auth/login?next=/checkout/${encodeURIComponent(orderId)}`);
  }

  const [order, snapshot] = await Promise.all([
    getOrderById(orderId),
    getOrderLiveSnapshot(orderId),
  ]);

  if (!order || !snapshot) {
    redirect("/cart");
  }

  if (session.user.role !== "ADMIN" && order.userId !== session.user.id) {
    redirect("/cart");
  }

  return (
    <CheckoutOrderStatusClient order={order} initialSnapshot={snapshot} />
  );
}
