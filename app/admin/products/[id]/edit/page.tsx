import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IconArrowLeft } from "@tabler/icons-react";
import { ProductEditForm } from "@/components/admin/product-edit-form";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { getAdminProductForEdit } from "@/lib/admin/products/get-product";
import { syncProductGalleryIfNeeded } from "@/lib/admin/products/sync-gallery";
import { syncProductMetadataFromKinguinIfNeeded } from "@/lib/admin/products/sync-metadata";
import { syncProductVideosIfNeeded } from "@/lib/admin/products/sync-videos";
import { syncProductClpFromSourceIfNeeded } from "@/lib/admin/products/sync-clp";
import { getEurToClpRate } from "@/lib/currency/exchange";
import { isR2Configured } from "@/lib/r2/env";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await getAdminProductForEdit(id);
  return {
    title: product ? `Editar: ${product.name}` : "Editar producto",
  };
}

export default async function AdminProductEditPage({ params }: PageProps) {
  const { id } = await params;
  const fx = await getEurToClpRate();
  await Promise.all([
    syncProductClpFromSourceIfNeeded(id, fx.rate),
    syncProductGalleryIfNeeded(id),
    syncProductVideosIfNeeded(id),
    syncProductMetadataFromKinguinIfNeeded(id),
  ]);
  const product = await getAdminProductForEdit(id);

  if (!product) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 md:space-y-8">
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit">
          <Link href="/admin/products">
            <IconArrowLeft className="size-4" />
            Volver a productos
          </Link>
        </Button>
        <DashboardPageHeader
          title="Editar producto"
          description="Revisa precios en CLP y publica el producto cuando esté listo."
        />
      </div>

      {!product.isActive ? (
        <Alert>
          <AlertTitle>Borrador</AlertTitle>
          <AlertDescription>
            Este producto no es visible en la tienda. Activa &quot;Publicado en
            tienda&quot; y guarda para publicarlo.
          </AlertDescription>
        </Alert>
      ) : null}

      <ProductEditForm
        product={product}
        exchangeRate={fx.rate}
        r2Configured={isR2Configured()}
      />
    </div>
  );
}
