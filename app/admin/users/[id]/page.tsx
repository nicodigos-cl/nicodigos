import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminUserDetailView } from "@/components/admin/admin-user-detail";
import { getAdminUserById } from "@/lib/admin/users/queries";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const user = await getAdminUserById(id);
  return {
    title: user ? `Usuario: ${user.name}` : "Usuario no encontrado",
  };
}

export default async function AdminUserDetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await getAdminUserById(id);

  if (!user) {
    notFound();
  }

  return <AdminUserDetailView user={user} />;
}
