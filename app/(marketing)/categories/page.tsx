import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { IconCategory, IconChevronRight } from "@tabler/icons-react";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { getStorefrontCategories } from "@/lib/store/categories/queries";
import { storeRoutes } from "@/lib/store/navigation";

export const metadata: Metadata = {
  title: "Categorías",
  description:
    "Explora keys, gift cards y licencias por tipo de producto digital.",
};

export const revalidate = 300;

export default async function CategoriesPage() {
  const categories = await getStorefrontCategories();

  return (
    <main className="flex-1 relative overflow-hidden bg-background">
      {/* Decorative background elements and deep indigo orbs */}
      <div className="absolute inset-0 admin-dashboard-grid opacity-20 pointer-events-none" />
      <div className="absolute top-[-10%] left-[-10%] -z-10 h-[550px] w-[550px] rounded-full bg-violet-500/10 blur-[130px] pointer-events-none" />
      <div className="absolute top-[30%] right-[-10%] -z-10 h-[450px] w-[450px] rounded-full bg-indigo-500/10 blur-[110px] pointer-events-none" />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 relative z-10 space-y-8">
        
        {/* Creative Hero Banner Header with Indigo/Violet Theme */}
        <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-r from-card via-indigo-500/5 to-card p-6 sm:p-10 shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 via-transparent to-indigo-500/5" />
          <div className="absolute -right-16 -top-16 size-48 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-500 border border-indigo-500/20">
                <IconCategory className="size-3.5" />
                Explora por Categorías
              </div>
              <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl bg-gradient-to-r from-foreground to-indigo-500 bg-clip-text">
                Categorías de Productos
              </h1>
              <p className="text-sm text-muted-foreground/90 max-w-xl leading-relaxed">
                Navega y filtra fácilmente por tipo de producto digital: juegos de PC, tarjetas de regalo de consola, suscripciones y licencias oficiales.
              </p>
            </div>
            {categories.length > 0 && (
              <div className="flex flex-col items-start md:items-end justify-center shrink-0 bg-background/60 backdrop-blur-md border border-border/40 rounded-2xl p-4 shadow-sm min-w-[160px]">
                <span className="text-2xl font-black text-indigo-500 tabular-nums">{categories.length}</span>
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Categorías</span>
              </div>
            )}
          </div>
        </div>

        {categories.length === 0 ? (
          <Empty className="py-16 border-dashed bg-muted/5">
            <EmptyHeader>
              <EmptyTitle className="text-base font-bold">
                Sin categorías
              </EmptyTitle>
              <EmptyDescription className="text-sm">
                Aún no hay categorías publicadas. Mientras tanto, puedes ver
                todo el catálogo.
              </EmptyDescription>
            </EmptyHeader>
            <Link
              href={storeRoutes.catalog}
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Ir al catálogo
            </Link>
          </Empty>
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <li key={category.id}>
                <Link
                  href={storeRoutes.category(category.slug)}
                  className="group block h-full"
                >
                  <article
                    className="flex h-full flex-col overflow-hidden rounded-2xl glass-card glass-card-hover transition-all duration-300"
                  >
                    <div className="relative aspect-[16/7] overflow-hidden bg-muted/20">
                      {category.bannerUrl || category.imageUrl ? (
                        <Image
                          src={category.bannerUrl ?? category.imageUrl!}
                          alt={category.name}
                          fill
                          unoptimized
                          sizes="(max-width:640px) 100vw, 400px"
                          className="object-cover transition-transform duration-500 group-hover:scale-106"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/10 via-muted to-indigo-500/10">
                          <IconCategory className="size-12 text-primary/40" />
                        </div>
                      )}
                      {/* Gradient overlay inside image for better text readability */}
                      <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/30 to-transparent" />
                      
                      <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3 z-10">
                        <div className="min-w-0">
                          <h2 className="font-heading text-lg font-extrabold text-foreground truncate">
                            {category.name}
                          </h2>
                          <p className="text-xs font-semibold text-muted-foreground/90">
                            {category.productCount === 1
                              ? "1 producto"
                              : `${category.productCount} productos`}
                          </p>
                        </div>
                        {category.imageUrl ? (
                          <div className="relative size-12 shrink-0 overflow-hidden rounded-xl border border-border bg-background shadow-md">
                            <Image
                              src={category.imageUrl}
                              alt=""
                              fill
                              unoptimized
                              sizes="48px"
                              className="object-cover"
                            />
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col gap-4 p-5 relative z-10">
                      {category.description ? (
                        <p className="line-clamp-2 text-sm text-muted-foreground leading-relaxed">
                          {category.description}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground/75">
                          Ver productos de {category.name.toLowerCase()}.
                        </p>
                      )}

                      <span className="mt-auto inline-flex items-center gap-1 text-sm font-bold text-primary group-hover:gap-1.5 transition-all">
                        Explorar
                        <IconChevronRight className="size-4" />
                      </span>
                    </div>
                  </article>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
