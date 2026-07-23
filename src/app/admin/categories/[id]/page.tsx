import { redirect } from "next/navigation";

type CategoryEditRedirectProps = {
  params: Promise<{ id: string }>;
};

/** Legacy edit route — editing now happens in a dialog on /admin/categories. */
export default async function CategoryEditRedirectPage({
  params,
}: CategoryEditRedirectProps) {
  const { id } = await params;
  redirect(`/admin/categories?edit=${encodeURIComponent(id)}`);
}
