import { ProductForm } from "@/components/admin/products/product-form";
import { getCategoryOptions } from "@/lib/products/queries";

export default async function NewProductPage() {
  const categories = await getCategoryOptions();

  return <ProductForm mode="create" categories={categories} />;
}
