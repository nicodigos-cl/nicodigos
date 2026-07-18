import { CreateOrderForm } from "@/components/admin/orders/create-order-form";
import { getActiveProductOptions } from "@/lib/orders/queries";

export default async function NewOrderPage() {
  const products = await getActiveProductOptions();
  return <CreateOrderForm products={products} />;
}
