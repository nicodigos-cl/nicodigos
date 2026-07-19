import { redirect } from "next/navigation";

type CategoryRedirectPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function CategoryRedirectPage({
  params,
}: CategoryRedirectPageProps) {
  const { slug } = await params;
  redirect(`/catalog?category=${encodeURIComponent(slug)}`);
}
