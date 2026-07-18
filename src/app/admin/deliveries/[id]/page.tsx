import { notFound } from "next/navigation";

import { DeliveryDetailView } from "@/components/admin/deliveries/delivery-detail";
import {
  getAvailableProductKeys,
  getDeliveryById,
} from "@/lib/deliveries/queries";

type DeliveryDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function DeliveryDetailPage({
  params,
}: DeliveryDetailPageProps) {
  const { id } = await params;
  const delivery = await getDeliveryById(id);

  if (!delivery) {
    notFound();
  }

  const availableKeys =
    delivery.deliveryMethod === "MANUAL" && delivery.product.hasKeyInventory
      ? await getAvailableProductKeys(delivery.product.id, 100)
      : [];

  return (
    <DeliveryDetailView delivery={delivery} availableKeys={availableKeys} />
  );
}
