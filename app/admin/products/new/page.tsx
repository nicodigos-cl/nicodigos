import type { Metadata } from "next";
import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";
import { CreateProductFromKinguinForm } from "@/components/admin/create-product-from-kinguin-form";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { Button } from "@/components/ui/button";
import { isKinguinConfigured } from "@/lib/kinguin/client";

export const metadata: Metadata = {
  title: "Nuevo producto — Admin",
};

export default function AdminNewProductPage() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 md:space-y-8">
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit">
          <Link href="/admin/products">
            <IconArrowLeft className="size-4" />
            Volver a productos
          </Link>
        </Button>
        <DashboardPageHeader
          title="Nuevo producto"
          description="Busca en Kinguin por nombre e importa el producto al catálogo local."
        />
      </div>

      <CreateProductFromKinguinForm kinguinConfigured={isKinguinConfigured()} />
    </div>
  );
}
