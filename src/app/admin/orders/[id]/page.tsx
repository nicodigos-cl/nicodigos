import { notFound } from "next/navigation";

import { OrderDetailView } from "@/components/admin/orders/order-detail-view";
import { getOrderById } from "@/lib/orders/queries";

type OrderDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function OrderDetailPage({
  params,
}: OrderDetailPageProps) {
  const { id } = await params;
  const order = await getOrderById(id);

  if (!order) {
    notFound();
  }

  return <OrderDetailView order={order} />;
}
