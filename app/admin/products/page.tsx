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
  title: "Productos",
};

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const resolvedParams = await searchParams;
  const page = resolvedParams.page ? parseInt(resolvedParams.page) : 1;
  const search = resolvedParams.search || "";

  if (page === 1 && !search) {
    getEurToClpRate()
      .then((fx) => {
        Promise.all([
          syncAllProductsClpFromSourceIfNeeded(fx.rate),
          syncAllProductGalleriesIfNeeded(),
          syncAllProductVideosIfNeeded(),
          syncAllProductMetadataFromKinguinIfNeeded(),
        ]).catch((err) => {
          console.error("Error in background products synchronization:", err);
        });
      })
      .catch((err) => {
        console.error("Error fetching FX rate for background sync:", err);
      });
  }

  const { products, total, totalPages, page: currentPage, stats } = await getAdminProducts({
    page,
    limit: 50,
    search,
  });

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

      <AdminProductsBoard
        products={products}
        total={total}
        page={currentPage}
        totalPages={totalPages}
        search={search}
        stats={stats}
      />
    </div>
  );
}
