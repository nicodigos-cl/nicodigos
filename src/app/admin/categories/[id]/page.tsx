import { notFound } from "next/navigation";

import { CategoryForm } from "@/components/admin/categories/category-form";
import {
  getCategoryById,
  getCategoryParentOptions,
} from "@/lib/categories/queries";

type CategoryEditPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CategoryEditPage({
  params,
}: CategoryEditPageProps) {
  const { id } = await params;

  const [category, parentOptions] = await Promise.all([
    getCategoryById(id),
    getCategoryParentOptions(id),
  ]);

  if (!category) {
    notFound();
  }

  return (
    <CategoryForm
      mode="edit"
      category={category}
      parentOptions={parentOptions}
    />
  );
}
