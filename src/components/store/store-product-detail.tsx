import Link from "next/link";
import {
  HiOutlineClock,
  HiOutlineShieldCheck,
  HiOutlineShoppingCart,
  HiOutlineLightningBolt,
  HiOutlineSupport,
  HiOutlineLockClosed,
} from "react-icons/hi";

import { StoreProductBackButton } from "@/components/store/store-product-back-button";
import { StoreProductBuyForm } from "@/components/store/store-product-buy-form";
import { StoreProductDetailSections } from "@/components/store/store-product-detail-sections";
import { StoreProductGallery } from "@/components/store/store-product-gallery";
import StoreProductCarousel from "@/components/store/store-product-carousel";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/products/format";
import type {
  StoreProductCardDto,
  StoreProductDetailDto,
} from "@/types/products";

type StoreProductDetailProps = {
  product: StoreProductDetailDto;
  relatedProducts: StoreProductCardDto[];
};

export function StoreProductDetail({
  product,
  relatedProducts,
}: StoreProductDetailProps) {
  // Calculate discount and savings
  const priceNum = Number(product.price);
  const compareAtPriceNum = product.compareAtPrice
    ? Number(product.compareAtPrice)
    : null;
  const hasOffer =
    product.isOffer && compareAtPriceNum && compareAtPriceNum > priceNum;
  const discountPct =
    hasOffer && compareAtPriceNum
      ? Math.round(((compareAtPriceNum - priceNum) / compareAtPriceNum) * 100)
      : null;
  const savingsAmount =
    hasOffer && compareAtPriceNum ? compareAtPriceNum - priceNum : null;

  const categoryHref = product.categories[0]
    ? `/catalog?category=${encodeURIComponent(product.categories[0].slug)}`
    : "/catalog";

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 max-lg:pt-16">
      {/* Mobile Top App Bar (Android Style) */}
      <header className="fixed top-0 inset-x-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/40 py-3.5 px-4 flex items-center justify-between lg:hidden shadow-xs">
        <div className="flex items-center gap-3">
          <StoreProductBackButton href={categoryHref} />
          <span className="max-w-[200px] truncate text-base font-bold tracking-tight text-foreground">
            {product.categories[0]?.name || "Detalle"}
          </span>
        </div>
        <div className="flex items-center">
          <Link
            href="/cart"
            className="p-1.5 hover:bg-muted/80 rounded-full transition-all active:scale-90"
            aria-label="Ver carrito"
          >
            <HiOutlineShoppingCart className="size-6 text-foreground" />
          </Link>
        </div>
      </header>

      {/* Full width Breadcrumbs (Desktop Only) */}
      <nav aria-label="Breadcrumb" className="mb-6 lg:mb-8 hidden lg:block">
        <ol className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-muted-foreground/80">
          <li>
            <Link
              href="/"
              className="hover:text-foreground transition-colors font-medium"
            >
              Inicio
            </Link>
          </li>
          <li aria-hidden className="text-muted-foreground/50">
            /
          </li>
          <li>
            <Link
              href="/catalog"
              className="hover:text-foreground transition-colors font-medium"
            >
              Catálogo
            </Link>
          </li>
          {product.categories[0] ? (
            <>
              <li aria-hidden className="text-muted-foreground/50">
                /
              </li>
              <li>
                <Link
                  href={`/catalog?category=${encodeURIComponent(product.categories[0].slug)}`}
                  className="hover:text-foreground transition-colors font-medium"
                >
                  {product.categories[0].name}
                </Link>
              </li>
            </>
          ) : null}
          <li aria-hidden className="text-muted-foreground/50">
            /
          </li>
          <li
            className="text-foreground font-semibold truncate max-w-[200px] sm:max-w-none"
            aria-current="page"
          >
            {product.name}
          </li>
        </ol>
      </nav>

      {/* Main product column grid */}
      <div className="lg:grid lg:grid-cols-12 lg:items-start lg:gap-x-12">
        {/* Left Column: Gallery & Info Accordions */}
        <div className="lg:col-span-7 space-y-6 lg:space-y-8">
          {/* Edge-to-edge Gallery on Mobile */}
          <div className="-mx-4 sm:mx-0">
            <StoreProductGallery images={product.images} />
          </div>

          <div className="hidden lg:block">
            <StoreProductDetailSections product={product} />
          </div>
        </div>

        {/* Right Column: Sticky buy container */}
        <div className="mt-8 px-0 sm:mt-12 lg:mt-0 lg:col-span-5 lg:sticky lg:top-24 lg:self-start">
          <div className="bg-card border border-border/50 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 max-lg:border-0 max-lg:bg-transparent max-lg:p-0 max-lg:shadow-none">
            {/* Badges strip */}
            <div className="flex flex-wrap items-center gap-1.5">
              {hasOffer ? (
                <Badge className="bg-primary text-primary-foreground font-semibold">
                  Oferta
                </Badge>
              ) : null}
              {product.isPreorder ? (
                <Badge variant="secondary" className="font-semibold">
                  Preventa
                </Badge>
              ) : null}
              <Badge variant="outline" className="border-border/80 font-medium">
                {product.deliveryLabel}
              </Badge>
            </div>

            {/* Title */}
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground/95 leading-tight">
                {product.name}
              </h1>

              {product.categories[0] && (
                <p className="text-xs sm:text-sm text-muted-foreground mt-1.5">
                  Categoría:{" "}
                  <span className="font-semibold text-foreground/80">
                    {product.categories[0].name}
                  </span>
                </p>
              )}
            </div>

            {/* Availability */}
            <div className="flex flex-col gap-2 rounded-2xl border border-border/40 bg-muted/30 px-4 py-3 text-sm">
              <div className="flex items-center gap-2">
                {product.inStock ? (
                  <>
                    <span className="relative flex size-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
                    </span>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                      Disponible
                    </span>
                    <span className="text-muted-foreground">
                      ({product.stockLabel})
                    </span>
                  </>
                ) : (
                  <>
                    <span className="relative flex size-2.5 rounded-full bg-destructive" />
                    <span className="font-semibold text-destructive">
                      Sin stock
                    </span>
                    <span className="text-muted-foreground">
                      ({product.stockLabel})
                    </span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <HiOutlineClock className="size-4 shrink-0" aria-hidden />
                <span>
                  Entrega:{" "}
                  <span className="font-semibold text-foreground">
                    {product.deliveryEta}
                  </span>
                </span>
              </div>
            </div>

            {/* Pricing Section */}
            <div className="space-y-2">
              <h2 className="sr-only">Información de precio</h2>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="text-3xl sm:text-4xl font-black tracking-tight tabular-nums text-foreground">
                  {formatMoney(product.price, product.currency)}
                  {product.priceIsPerThousand ? (
                    <span className="ml-1 text-sm font-medium text-muted-foreground">
                      / 1.000
                    </span>
                  ) : null}
                </p>
                {compareAtPriceNum && hasOffer ? (
                  <p className="text-base sm:text-lg tabular-nums text-muted-foreground/75 line-through">
                    {formatMoney(product.compareAtPrice!, product.currency)}
                  </p>
                ) : null}
              </div>

              {/* Offer savings details */}
              {hasOffer && savingsAmount && discountPct && (
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="border-emerald-500/35 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 font-semibold text-xs py-0.5 px-2"
                  >
                    Ahorras {discountPct}%
                  </Badge>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    Ahorras {formatMoney(savingsAmount, product.currency)} en
                    esta compra
                  </p>
                </div>
              )}
            </div>

            {/* Platform / limitations info */}
            {(product.platform || product.regionAvailabilityLabel) && (
              <div className="bg-muted/45 dark:bg-muted/20 rounded-2xl p-4 text-xs space-y-2 border border-border/20">
                {product.platform && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-medium">
                      Plataforma
                    </span>
                    <span className="text-foreground font-semibold">
                      {product.platform}
                    </span>
                  </div>
                )}
                {product.regionAvailabilityLabel && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-medium">
                      Región
                    </span>
                    <span className="text-chart-4 font-semibold">
                      {product.regionAvailabilityLabel}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Order / Add To Cart Form */}
            <StoreProductBuyForm
              productId={product.id}
              productName={product.name}
              productHref={product.href}
              deliveryMethod={product.deliveryMethod}
              inStock={product.inStock}
              price={product.price}
              currency={product.currency}
              priceIsPerThousand={product.priceIsPerThousand}
              deliveryEta={product.deliveryEta}
              regionAvailabilityLabel={product.regionAvailabilityLabel}
              maxOrderQuantity={product.maxOrderQuantity}
              smmServiceType={product.smmServiceType}
              smmMin={product.smmMin}
              smmMax={product.smmMax}
            />
          </div>
        </div>
      </div>

      {/* Accordions for mobile layout (below the buy button) */}
      <div className="block lg:hidden mt-8">
        <StoreProductDetailSections product={product} />
      </div>

      {/* Trust benefit banner grid */}
      <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 border-t border-border/40 pt-12">
        <div className="flex items-start gap-3.5 p-5 rounded-2xl border border-border/40 bg-card/40 shadow-xs hover:border-primary/20 transition-all duration-300">
          <HiOutlineLightningBolt className="size-6 text-primary shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-foreground/90">
              Entrega Automática
            </h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Tus códigos o licencias se despachan de forma instantánea al
              instante de pagar.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3.5 p-5 rounded-2xl border border-border/40 bg-card/40 shadow-xs hover:border-primary/20 transition-all duration-300">
          <HiOutlineSupport className="size-6 text-primary shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-foreground/90">
              Soporte 24/7
            </h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Soporte en vivo y atención técnica personalizada directa en
              español.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3.5 p-5 rounded-2xl border border-border/40 bg-card/40 shadow-xs hover:border-primary/20 transition-all duration-300">
          <HiOutlineLockClosed className="size-6 text-primary shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-foreground/90">
              Pago 100% Seguro
            </h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Transacciones seguras y encriptadas con Flow.cl, Webpay Plus y
              MACH.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3.5 p-5 rounded-2xl border border-border/40 bg-card/40 shadow-xs hover:border-primary/20 transition-all duration-300">
          <HiOutlineShieldCheck className="size-6 text-primary shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-foreground/90">
              Garantía de Activación
            </h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Garantía de funcionamiento de por vida o reembolso del 100% de tu
              dinero.
            </p>
          </div>
        </div>
      </div>

      {/* Related Products Section (Using Embla Carousel) */}
      {relatedProducts && relatedProducts.length > 0 && (
        <StoreProductCarousel
          id="related-products"
          title="También te puede interesar"
          description="Descubre otros productos recomendados y las mejores ofertas seleccionadas para ti."
          products={relatedProducts}
          tone="trending"
          className="mt-8"
        />
      )}
    </div>
  );
}
