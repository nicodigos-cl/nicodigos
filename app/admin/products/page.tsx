import type { Metadata } from "next";
import Link from "next/link";
import { IconPlus } from "@tabler/icons-react";
import { AdminProductsBoard } from "@/components/admin/admin-products-board";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { Button } from "@/components/ui/button";
import { getAdminProducts } from "@/lib/admin/products/queries";
import { syncAllProductGalleriesIfNeeded } from "@/lib/admin/products/sync-gallery";
import { syncAllProductMetadataFromKinguinIfNeeded } from "@/lib/admin/products/sync-metadata";
import { syncAllProductVideosIfNeeded } from "@/lib/admin/products/sync-videos";
import { syncAllProductsClpFromSourceIfNeeded } from "@/lib/admin/products/sync-clp";
import { getEurToClpRate } from "@/lib/currency/exchange";

export const metadata: Metadata = {
  title: "Productos — Admin",
};

export default async function AdminProductsPage() {
  const fx = await getEurToClpRate();
  await Promise.all([
    syncAllProductsClpFromSourceIfNeeded(fx.rate),
    syncAllProductGalleriesIfNeeded(),
    syncAllProductVideosIfNeeded(),
    syncAllProductMetadataFromKinguinIfNeeded(),
  ]);
  const products = await getAdminProducts();

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 md:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <DashboardPageHeader
          title="Productos"
          description="Catálogo local sincronizado desde Kinguin."
        />
        <Button asChild className="shrink-0 self-start">
          <Link href="/admin/products/new">
            <IconPlus className="size-4" />
            Agregar producto
          </Link>
        </Button>
      </div>

      <AdminProductsBoard products={products} />
    </div>
  );
}
