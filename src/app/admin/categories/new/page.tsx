import { CategoryForm } from "@/components/admin/categories/category-form";
import { getCategoryParentOptions } from "@/lib/categories/queries";

export default async function NewCategoryPage() {
  const parentOptions = await getCategoryParentOptions();

  return <CategoryForm mode="create" parentOptions={parentOptions} />;
}
