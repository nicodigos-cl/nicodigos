import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminOrderDetailView } from "@/components/admin/admin-order-detail";
import { getAdminOrderById } from "@/lib/admin/orders/queries";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const order = await getAdminOrderById(id);
  return {
    title: order ? `Pedido ${id.slice(0, 8)}…` : "Pedido no encontrado",
  };
}

export default async function AdminOrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const order = await getAdminOrderById(id);

  if (!order) {
    notFound();
  }

  return <AdminOrderDetailView order={order} />;
}
