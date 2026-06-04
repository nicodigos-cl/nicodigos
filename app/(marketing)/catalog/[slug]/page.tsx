import prisma from "@/lib/prisma";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IconBolt, IconChevronRight, IconClock } from "@tabler/icons-react";

import { PlatformBadge } from "@/components/store/platform-badge";
import { ProductGallery } from "@/components/store/product-gallery";
import { ProductStoreActions } from "@/components/store/product-store-actions";
import { ProductDetailsTabs } from "@/components/store/product-tabs";
import { ProductActivationDialog } from "@/components/store/product-activation-dialog";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/currency/format";
import { getOptionalStoreSession } from "@/lib/store/auth";
import { storeRoutes } from "@/lib/store/navigation";
import { resolveProductSeoMetadata } from "@/lib/seo/product";
import {
  buildProductHighlights,
  plainDescriptionPreview,
} from "@/lib/store/products/description-preview";
import { getStorefrontProductBySlug } from "@/lib/store/products/queries";
import { isProductInWishlist } from "@/lib/store/wishlist/queries";

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
      <dt className="text-sm font-medium text-foreground">{label}</dt>
      <dd className="mt-1 text-sm/6 text-muted-foreground">
        {items.join(", ")}
      </dd>
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

  const descriptionPreview = plainDescriptionPreview(product.description);
  const highlights = buildProductHighlights(product);
  const inStock = product.qty > 0 || product.isPreorder;
  const primaryVideo = product.videos[0] ?? null;

  return (
    <main className="flex-1 bg-background">
      <div className="mx-auto px-4 py-10 sm:px-6 sm:py-16 lg:max-w-7xl lg:px-8">
        <nav
          aria-label="Breadcrumb"
          className="mb-8 flex flex-wrap items-center gap-1.5 text-xs sm:text-sm text-muted-foreground/80 bg-muted/20 w-fit px-3.5 py-1.5 rounded-full border border-border/40"
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

        <div className="lg:grid lg:grid-cols-7 lg:grid-rows-1 lg:gap-x-8 lg:gap-y-10 xl:gap-x-16">
          <div className="lg:col-span-4 lg:row-end-1">
            <ProductGallery
              name={product.name}
              coverImageUrl={product.coverImageUrl}
              images={product.images}
              primaryVideo={primaryVideo}
              layout="overview"
            />
          </div>

          <div className="mx-auto mt-10 max-w-2xl sm:mt-12 lg:col-span-3 lg:row-span-2 lg:row-end-2 lg:mt-0 lg:max-w-none">
            <div className="flex flex-wrap items-center gap-2">
              <PlatformBadge platform={product.platform} showLabel size="md" />
              {product.isOffer ? (
                <Badge className="border-0 bg-rose-500 text-white font-bold text-[10px] uppercase">
                  <IconBolt className="size-3" aria-hidden />
                  Oferta
                </Badge>
              ) : null}
              {product.isPreorder ? (
                <Badge
                  variant="outline"
                  className="font-semibold text-[10px] uppercase border-violet-500/30 text-violet-600 dark:text-violet-400"
                >
                  <IconClock className="size-3" aria-hidden />
                  Preventa
                </Badge>
              ) : null}
            </div>

            <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {product.name}
            </h1>

            {product.genres.length > 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {product.genres.join(" · ")}
              </p>
            ) : null}

            <p className="mt-2 text-3xl font-bold tracking-tight text-foreground tabular-nums sm:text-4xl">
              {formatMoney(product.sellPrice)}
            </p>

            {product.qty > 0 ? (
              <p className="mt-1 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                {product.qty} en stock — entrega al tiro
              </p>
            ) : (
              <p className="mt-1 text-sm font-medium text-muted-foreground">
                Sin stock por ahora
              </p>
            )}

            {descriptionPreview ? (
              <p className="mt-6 text-sm/6 text-muted-foreground">
                {descriptionPreview}
              </p>
            ) : null}

            <div className="mt-10">
              <ProductStoreActions
                productId={product.id}
                inWishlist={inWishlist}
                disabled={!inStock}
                split
              />
            </div>

            <section className="mt-10 border-t border-border pt-10">
              <h2 className="text-sm font-medium text-foreground">
                Lo que incluye
              </h2>
              <ul
                role="list"
                className="mt-4 list-disc space-y-1 pl-5 text-sm/6 text-muted-foreground marker:text-muted-foreground/30"
              >
                {highlights.map((highlight) => (
                  <li key={highlight} className="pl-2">
                    {highlight}
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-10 border-t border-border pt-10">
              <h2 className="text-sm font-medium text-foreground">
                Activación
              </h2>
              <p className="mt-4 text-sm/6 text-muted-foreground">
                Recibes tu key o instrucciones en tu cuenta y correo apenas se
                confirme el pago.{" "}
                <ProductActivationDialog activationDetails={product.activationDetails} />
              </p>
            </section>

            <dl className="mt-10 grid gap-6 border-t border-border pt-10 sm:grid-cols-2">
              <MetaList label="Desarrollador" items={product.developers} />
              <MetaList label="Editor" items={product.publishers} />
              {product.releaseDate ? (
                <div>
                  <dt className="text-sm font-medium text-foreground">
                    Lanzamiento
                  </dt>
                  <dd className="mt-1 text-sm/6 text-muted-foreground">
                    {product.releaseDate}
                  </dd>
                </div>
              ) : null}
              {product.regionName ? (
                <div>
                  <dt className="text-sm font-medium text-foreground">
                    Región
                  </dt>
                  <dd className="mt-1 text-sm/6 text-muted-foreground">
                    {product.regionName}
                  </dd>
                </div>
              ) : null}
              <MetaList label="Idiomas" items={product.languages} />
              {product.ageRating ? (
                <div>
                  <dt className="text-sm font-medium text-foreground">
                    Clasificación
                  </dt>
                  <dd className="mt-1 text-sm/6 text-muted-foreground">
                    {product.ageRating}
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>

          <div
            id="product-tabs"
            className="mx-auto mt-12 w-full max-w-2xl lg:col-span-4 lg:mt-0 lg:max-w-none"
          >
            <ProductDetailsTabs
              layout="overview"
              description={product.description}
              activationDetails={product.activationDetails}
              regionalLimitations={product.regionalLimitations}
              countryLimitations={product.countryLimitations}
              systemRequirements={product.systemRequirements}
            />
          </div>
        </div>

        <div className="mt-12 flex flex-wrap gap-4 border-t border-border pt-10">
          <Link
            href={storeRoutes.catalog}
            className="text-sm font-medium text-primary hover:text-primary/80"
          >
            ← Volver al catálogo
          </Link>
          {product.isOffer ? (
            <Link
              href={storeRoutes.offers}
              className="text-sm font-medium text-primary hover:text-primary/80"
            >
              Ver más ofertas
            </Link>
          ) : null}
        </div>
      </div>

      {/* Sticky bottom actions bar on mobile */}
      <div className="lg:hidden fixed bottom-16 inset-x-0 bg-background/95 backdrop-blur-md border-t border-border/80 p-4 z-40 flex items-center justify-between gap-4 shadow-lg safe-bottom">
        <div className="min-w-0">
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Total</p>
          <p className="text-lg font-black text-primary tabular-nums">
            {formatMoney(product.sellPrice)}
          </p>
        </div>
        <div className="flex-1 max-w-[240px]">
          <ProductStoreActions
            productId={product.id}
            inWishlist={inWishlist}
            disabled={!inStock}
            className="w-full flex-row gap-2 [&_button]:min-h-10 [&_button]:flex-1 [&_button]:text-xs"
          />
        </div>
      </div>
    </main>
  );
}
