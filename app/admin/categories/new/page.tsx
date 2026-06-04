import type { Metadata } from "next";
import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";
import { CategoryEditForm } from "@/components/admin/category-edit-form";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { Button } from "@/components/ui/button";
import { isR2Configured } from "@/lib/r2/env";

export const metadata: Metadata = {
  title: "Nueva categoría",
};

export default function AdminNewCategoryPage() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 md:space-y-8">
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit">
          <Link href="/admin/categories">
            <IconArrowLeft className="size-4" />
            Volver a categorías
          </Link>
        </Button>
        <DashboardPageHeader
          title="Nueva categoría"
          description="Define nombre, orden, imagen y banner antes de publicar en la tienda."
        />
      </div>

      <CategoryEditForm r2Configured={isR2Configured()} />
    </div>
  );
}
