import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IconBolt, IconChevronRight, IconClock } from "@tabler/icons-react";

import { PlatformBadge } from "@/components/store/platform-badge";
import { ProductGallery } from "@/components/store/product-gallery";
import { ProductStoreActions } from "@/components/store/product-store-actions";
import { ProductDetailsTabs } from "@/components/store/product-tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatMoney } from "@/lib/currency/format";
import { getOptionalStoreSession } from "@/lib/store/auth";
import { storeRoutes } from "@/lib/store/navigation";
import { resolveProductSeoMetadata } from "@/lib/seo/product";
import { getStorefrontProductBySlug } from "@/lib/store/products/queries";
import { isProductInWishlist } from "@/lib/store/wishlist/queries";
import { cn } from "@/lib/utils";

export const revalidate = 300;

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getStorefrontProductBySlug(slug);

  if (!product) {
    return { title: "Producto no encontrado" };
  }

  return resolveProductSeoMetadata(product, product.seoMetadata);
}

function MetaList({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-foreground">{items.join(", ")}</dd>
    </div>
  );
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getStorefrontProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const session = await getOptionalStoreSession();
  const inWishlist =
    session?.user != null
      ? await isProductInWishlist(session.user.id, product.id)
      : false;

  return (
    <main className="flex-1 relative overflow-hidden bg-slate-50/50 dark:bg-background">
      {/* Decorative background elements and glowing orbs */}
      <div className="absolute inset-0 admin-dashboard-grid opacity-20 pointer-events-none" />
      <div className="absolute top-[-10%] right-[-10%] -z-10 h-[600px] w-[600px] rounded-full bg-primary/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[20%] left-[-15%] -z-10 h-[500px] w-[500px] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 relative z-10 space-y-6">
        {/* Breadcrumb Navigation */}
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm text-muted-foreground/80 bg-muted/20 w-fit px-3.5 py-1.5 rounded-full border border-border/40 backdrop-blur-sm"
        >
          <Link
            href={storeRoutes.catalog}
            className="hover:text-foreground transition-colors font-medium"
          >
            Catálogo
          </Link>
          {product.category ? (
            <>
              <IconChevronRight
                className="size-3.5 shrink-0 text-muted-foreground/50"
                aria-hidden
              />
              <Link
                href={storeRoutes.category(product.category.slug)}
                className="hover:text-foreground transition-colors font-medium"
              >
                {product.category.name}
              </Link>
            </>
          ) : null}
          <IconChevronRight
            className="size-3.5 shrink-0 text-muted-foreground/50"
            aria-hidden
          />
          <span className="line-clamp-1 text-foreground font-semibold max-w-[200px] sm:max-w-none">
            {product.name}
          </span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start">
          {/* Gallery component */}
          <div className="space-y-4">
            <ProductGallery
              name={product.name}
              coverImageUrl={product.coverImageUrl}
              images={product.images}
            />
          </div>

          {/* Details / Buy Section */}
          <div className="space-y-6 lg:sticky lg:top-24">
            <div className="space-y-3.5">
              <div className="flex flex-wrap items-center gap-2">
                <PlatformBadge
                  platform={product.platform}
                  showLabel
                  size="md"
                />
                {product.isOffer ? (
                  <Badge className="border-0 bg-rose-500 text-white font-bold text-[10px] tracking-wider uppercase px-2.5 py-0.5 shadow-sm animate-pulse">
                    <IconBolt className="size-3 mr-0.5 fill-current" />
                    Oferta
                  </Badge>
                ) : null}
                {product.isPreorder ? (
                  <Badge
                    variant="secondary"
                    className="font-semibold text-[10px] tracking-wider uppercase px-2 py-0.5 bg-indigo-500/10 text-indigo-500 border-indigo-500/20"
                  >
                    <IconClock className="size-3 mr-0.5" />
                    Preventa
                  </Badge>
                ) : null}
              </div>

              <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground bg-gradient-to-r from-foreground to-foreground/90 bg-clip-text leading-tight">
                {product.name}
              </h1>

              {product.genres.length > 0 ? (
                <p className="text-xs sm:text-sm text-muted-foreground/80 font-medium">
                  {product.genres.join(" · ")}
                </p>
              ) : null}
            </div>

            {/* Buy Card */}
            <Card className="bg-card border border-border/80 shadow-lg dark:shadow-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-primary/5 via-transparent to-primary/5 px-6 py-4 border-b border-border/40 flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                  Precio de venta
                </span>

                {/* Custom stock status with pulsing dot */}
                {product.qty > 0 ? (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                    </span>
                    <span>
                      {product.qty} Disponible{product.qty === 1 ? "" : "s"}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                    <span className="size-1.5 rounded-full bg-rose-500"></span>
                    <span>Sin stock</span>
                  </div>
                )}
              </div>

              <CardContent className="p-6 space-y-5">
                <div className="space-y-1">
                  <div className="text-3xl sm:text-4xl font-black text-foreground tabular-nums tracking-tight">
                    {formatMoney(product.sellPrice)}
                  </div>
                  {product.isPreorder ? (
                    <p className="text-xs text-indigo-500 font-semibold">
                      * Este producto es una preventa y se entregará al
                      lanzamiento oficial.
                    </p>
                  ) : null}
                </div>

                <ProductStoreActions
                  productId={product.id}
                  inWishlist={inWishlist}
                />

                <div className="rounded-xl bg-muted/40 p-3.5 border border-border/30 text-xs text-muted-foreground/90 space-y-1">
                  <div className="font-bold text-foreground flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Entrega Digital Instantánea
                  </div>
                  <p>
                    Recibirás tu código de activación e instrucciones
                    directamente en tu cuenta y correo una vez completado el
                    pago.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Spec Sheet Grid */}
            <dl className="grid gap-4 rounded-2xl border border-border/70 bg-muted/40 dark:bg-card/25 p-5 sm:grid-cols-2 shadow-inner">
              <MetaList label="Desarrollador" items={product.developers} />
              <MetaList label="Editor" items={product.publishers} />
              {product.releaseDate ? (
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                    Lanzamiento
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-foreground">
                    {product.releaseDate}
                  </dd>
                </div>
              ) : null}
              {product.regionName ? (
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                    Región
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-foreground">
                    {product.regionName}
                  </dd>
                </div>
              ) : null}
              <MetaList label="Idiomas" items={product.languages} />
              {product.ageRating ? (
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                    Clasificación
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-foreground">
                    {product.ageRating}
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
        </div>

        {/* Detailed Tabs/Content */}
        <div className="mt-12 border-t border-border/20 pt-10">
          <ProductDetailsTabs
            description={product.description}
            activationDetails={product.activationDetails}
            regionalLimitations={product.regionalLimitations}
            countryLimitations={product.countryLimitations}
            systemRequirements={product.systemRequirements}
            videos={product.videos}
          />
        </div>

        <Separator className="my-10 bg-border/40" />

        <div className="flex flex-wrap gap-4 pt-2">
          <Link
            href={storeRoutes.catalog}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors bg-primary/5 hover:bg-primary/10 px-4 py-2 rounded-xl border border-primary/15"
          >
            ← Volver al catálogo
          </Link>
          {product.isOffer ? (
            <Link
              href={storeRoutes.offers}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors bg-primary/5 hover:bg-primary/10 px-4 py-2 rounded-xl border border-primary/15"
            >
              Ver más ofertas
            </Link>
          ) : null}
        </div>
      </div>
    </main>
  );
}
