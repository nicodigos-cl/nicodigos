import Link from "next/link";
import { HomeProductsCarousel } from "@/components/marketing/home-products-carousel";
import { Button } from "@/components/ui/button";
import { storeRoutes } from "@/lib/store/navigation";
import { getStorefrontProducts } from "@/lib/store/products";
import { IconChevronRight, IconArrowRight, IconSparkles } from "@tabler/icons-react";

export const revalidate = 300;

export default async function HomePage() {
  const products = await getStorefrontProducts();

  return (
    <main className="flex-1 relative overflow-hidden bg-background">
      {/* Decorative background grid and orbs */}
      <div className="absolute inset-0 admin-dashboard-grid opacity-20 pointer-events-none" />
      <div className="absolute top-[-10%] right-[-10%] -z-10 h-[500px] w-[500px] rounded-full bg-primary/8 blur-[120px] dark:bg-primary/5 pointer-events-none" />
      <div className="absolute top-[30%] left-[-10%] -z-10 h-[600px] w-[600px] rounded-full bg-indigo-500/5 blur-[150px] pointer-events-none" />

      <section className="relative py-12 sm:py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-12 lg:grid lg:grid-cols-[minmax(0,28rem)_1fr] lg:items-center lg:gap-16">
            
            {/* Left Column: Hero Content */}
            <div className="space-y-8 max-w-xl">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary border border-primary/20 dark:border-primary/30">
                  <span className="flex size-1.5 rounded-full bg-primary animate-pulse" />
                  Marketplace digital · Chile
                </div>
                <h1 className="font-heading text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl leading-tight">
                  Keys, gift cards y <span className="bg-gradient-to-r from-primary to-indigo-500 bg-clip-text text-transparent">licencias al instante</span>
                </h1>
                <p className="text-base sm:text-lg text-muted-foreground/90 leading-relaxed">
                  Compra juegos, software, suscripciones y códigos digitales con entrega rápida, garantía asegurada y soporte local en Nicodigos.
                </p>
              </div>
              
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="rounded-xl shadow-lg shadow-primary/15 hover:shadow-primary/25 transition-all gap-1.5 group">
                  <Link href={storeRoutes.catalog}>
                    Ver catálogo
                    <IconArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="rounded-xl glass-card border-border/40 hover:bg-muted/40 transition-colors">
                  <Link href={storeRoutes.offers}>Ofertas de hoy</Link>
                </Button>
              </div>
            </div>

            {/* Right Column: Featured Products Carousel */}
            <div className="relative min-w-0 lg:-mr-[max(0,calc((100vw-80rem)/2+2rem))]">
              <div className="mb-4 flex items-end justify-between gap-3 pr-4 sm:pr-6 lg:pr-8">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <IconSparkles className="size-4 text-primary animate-pulse" />
                    <p className="text-sm font-bold text-foreground tracking-tight uppercase">
                      Destacados
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Códigos listos para entrega inmediata
                  </p>
                </div>
                <Link
                  href={storeRoutes.catalog}
                  className="shrink-0 text-sm font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-0.5 group"
                >
                  Ver todos
                  <IconChevronRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
              
              {/* Carousel wrapper with glowing card boundary */}
              <div className="relative p-2.5 rounded-3xl border border-border/10 bg-background/40 dark:bg-background/10 backdrop-blur-sm shadow-xl shadow-black/2">
                <HomeProductsCarousel products={products} />
              </div>
            </div>

          </div>
        </div>
      </section>
    </main>
  );
}

