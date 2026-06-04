import type { Metadata } from "next";
import Link from "next/link";
import { IconPlus } from "@tabler/icons-react";
import { AdminCategoriesBoard } from "@/components/admin/admin-categories-board";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { Button } from "@/components/ui/button";
import { getAdminCategories } from "@/lib/admin/categories/queries";

export const metadata: Metadata = {
  title: "Categorías",
};

export default async function AdminCategoriesPage() {
  const categories = await getAdminCategories();

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 md:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <DashboardPageHeader
          title="Categorías"
          description="Agrupa productos para navegación, filtros e imágenes en la tienda."
        />
        <Button asChild className="shrink-0 self-start">
          <Link href="/admin/categories/new">
            <IconPlus className="size-4" />
            Nueva categoría
          </Link>
        </Button>
      </div>

      <AdminCategoriesBoard categories={categories} />
    </div>
  );
}
