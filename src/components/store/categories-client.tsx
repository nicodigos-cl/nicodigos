"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useMemo } from "react";
import { HiOutlineCollection, HiChevronRight, HiSearch, HiX } from "react-icons/hi";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { FlickeringGrid } from "@/components/ui/flickering-grid";
import { cn } from "@/lib/utils";
import type { StoreCategoryTreeDto } from "@/lib/categories/queries";

type StoreCategoriesClientProps = {
  categories: StoreCategoryTreeDto[];
};

export default function StoreCategoriesClient({
  categories,
}: StoreCategoriesClientProps) {
  const [selectedId, setSelectedId] = useState<string>(
    categories[0]?.id || ""
  );
  const [searchQuery, setSearchQuery] = useState("");

  // Filter categories and subcategories based on search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;

    const query = searchQuery.toLowerCase().trim();
    return categories
      .map((cat) => {
        // If parent category name or description matches
        const catMatches =
          cat.name.toLowerCase().includes(query) ||
          (cat.description && cat.description.toLowerCase().includes(query));

        // Filter subcategories that match
        const matchingChildren = cat.children.filter(
          (sub) =>
            sub.name.toLowerCase().includes(query) ||
            (sub.description && sub.description.toLowerCase().includes(query))
        );

        if (catMatches || matchingChildren.length > 0) {
          return {
            ...cat,
            // If parent matches but no children match, keep all children; otherwise only keep matches
            children: matchingChildren.length > 0 ? matchingChildren : cat.children,
          };
        }
        return null;
      })
      .filter((cat): cat is StoreCategoryTreeDto => cat !== null);
  }, [categories, searchQuery]);

  // Adjust active selection if current active selection gets filtered out
  const activeCategory = useMemo(() => {
    const found = filteredCategories.find((cat) => cat.id === selectedId);
    return found || filteredCategories[0] || null;
  }, [filteredCategories, selectedId]);

  return (
    <div className="w-full min-h-screen bg-background">
      {/* ========================================================================= */}
      {/* MOBILE & TABLET LAYOUT (Premium Native Android Style) */}
      {/* ========================================================================= */}
      <div className="flex flex-col h-[calc(100dvh-4rem-5rem)] lg:hidden overflow-hidden bg-background">
        
        {/* Sleek Search Bar */}
        <div className="px-4 py-2 border-b border-border/40 bg-background/95 backdrop-blur-md flex items-center gap-2">
          <div className="relative flex-1">
            <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
            <input
              type="text"
              placeholder="Buscar categorías o software..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-muted/40 border border-border/30 rounded-full py-1.5 pl-9 pr-8 text-xs text-foreground placeholder:text-muted-foreground/75 focus:outline-none focus:border-primary/50 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <HiX className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {filteredCategories.length > 0 ? (
          <div className="flex flex-1 overflow-hidden">
            {/* Left Navigation Panel (Tabs with Indicator Glow) */}
            <div className="w-[84px] flex-none border-r border-border/30 bg-muted/10 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex flex-col min-h-full py-2">
                {filteredCategories.map((cat) => {
                  const active = activeCategory?.id === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedId(cat.id)}
                      className={cn(
                        "w-full px-1 py-3 text-center flex flex-col items-center gap-1 transition-all relative select-none outline-none active:bg-muted/10",
                        active ? "text-primary font-black" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {/* Smooth Active Background Indicator */}
                      {active && (
                        <div className="absolute inset-y-1 left-0 right-1 rounded-r-xl bg-primary/5 border-l-3 border-primary animate-fade-in duration-300" />
                      )}

                      {cat.imageUrl ? (
                        <div
                          className={cn(
                            "relative size-9 rounded-full overflow-hidden transition-all duration-300 ring-2 z-10",
                            active
                              ? "ring-primary scale-110 shadow-md shadow-primary/10"
                              : "ring-border/40 scale-100"
                          )}
                        >
                          <Image
                            src={cat.imageUrl}
                            alt=""
                            fill
                            unoptimized
                            className="object-cover"
                            sizes="36px"
                          />
                        </div>
                      ) : (
                        <div
                          className={cn(
                            "size-9 rounded-full flex items-center justify-center transition-all duration-300 ring-2 z-10",
                            active
                              ? "bg-primary text-primary-foreground ring-primary scale-110 shadow-md shadow-primary/10"
                              : "bg-muted text-muted-foreground ring-border/40"
                          )}
                        >
                          <HiOutlineCollection className="size-4.5" />
                        </div>
                      )}

                      <span className="text-[10px] tracking-tight leading-tight line-clamp-2 px-0.5 z-10">
                        {cat.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Content Panel */}
            <div className="flex-1 overflow-y-auto p-4 bg-background">
              {activeCategory && (
                <div className="animate-fade-in duration-300 space-y-4">
                  
                  {/* Category Banner Card */}
                  <div className="relative h-24 rounded-2xl overflow-hidden shadow-sm border border-border/10">
                    {activeCategory.imageUrl ? (
                      <Image
                        src={activeCategory.imageUrl}
                        alt=""
                        fill
                        unoptimized
                        className="object-cover"
                        sizes="(max-width: 768px) 60vw"
                      />
                    ) : (
                      <div className="size-full bg-gradient-to-tr from-primary/10 to-primary/5" />
                    )}
                    {/* Shadow overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent" />
                    <div className="absolute bottom-3 left-4 right-4 text-white">
                      <div className="flex items-center justify-between">
                        <h2 className="text-sm font-black tracking-tight leading-tight">
                          {activeCategory.name}
                        </h2>
                        <Link
                          href={`/categories/${activeCategory.slug}`}
                          className="text-[9px] font-bold text-primary-foreground bg-primary/80 backdrop-blur-md px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-xs"
                        >
                          Todo
                          <HiChevronRight className="size-3" />
                        </Link>
                      </div>
                      {activeCategory.description && (
                        <p className="text-[9px] text-white/75 mt-0.5 line-clamp-2 leading-tight">
                          {activeCategory.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Subcategories Grid */}
                  {activeCategory.children && activeCategory.children.length > 0 ? (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground/80">
                          Subcategorías
                        </span>
                        <span className="text-[9px] font-semibold text-muted-foreground">
                          {activeCategory.children.length} items
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        {activeCategory.children.map((subcat) => (
                          <Link
                            key={subcat.id}
                            href={`/categories/${subcat.slug}`}
                            className="flex flex-col rounded-xl overflow-hidden border border-border/30 bg-card hover:border-primary/20 transition-all duration-300 active:scale-95 shadow-xs"
                          >
                            <div className="relative w-full aspect-4/3 overflow-hidden bg-muted">
                              {subcat.imageUrl ? (
                                <Image
                                  src={subcat.imageUrl}
                                  alt={subcat.name}
                                  fill
                                  unoptimized
                                  className="object-cover"
                                  sizes="(max-width: 768px) 30vw"
                                />
                              ) : (
                                <div className="size-full flex items-center justify-center bg-primary/5 text-primary">
                                  <HiOutlineCollection className="size-5" />
                                </div>
                              )}
                              {/* Quantity Badge */}
                              <div className="absolute top-1.5 right-1.5 bg-black/60 backdrop-blur-sm text-[8px] font-black text-white px-1.5 py-0.5 rounded-md border border-white/10">
                                {subcat.productsCount}
                              </div>
                            </div>
                            
                            <div className="p-2 flex flex-col justify-center min-h-[44px]">
                              <span className="text-[10px] font-bold text-foreground tracking-tight leading-tight line-clamp-2">
                                {subcat.name}
                              </span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 px-4 text-center border border-dashed border-border/40 rounded-2xl bg-muted/10">
                      <div className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2">
                        <HiOutlineCollection className="size-4" />
                      </div>
                      <p className="text-xs font-bold text-foreground">
                        Sin subcategorías
                      </p>
                      <p className="text-[9px] text-muted-foreground mt-0.5 max-w-[170px] leading-tight">
                        Explora la colección completa de productos directamente.
                      </p>
                      <Link
                        href={`/categories/${activeCategory.slug}`}
                        className="mt-3.5 inline-flex items-center justify-center rounded-full bg-primary px-4 py-1.5 text-[9px] font-extrabold text-primary-foreground shadow-sm active:scale-95 transition-all"
                      >
                        Ver todos los productos
                      </Link>
                    </div>
                  )}

                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 p-6 text-center">
            <HiOutlineCollection className="size-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-semibold text-foreground">No encontramos categorías</p>
            <p className="text-xs text-muted-foreground mt-1">Prueba con otra búsqueda o limpia el filtro.</p>
            <button
              onClick={() => setSearchQuery("")}
              className="mt-4 text-xs font-bold text-primary hover:underline"
            >
              Limpiar búsqueda
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* DESKTOP LAYOUT (Premium High-End Visual Style) */}
      {/* ========================================================================= */}
      <div className="hidden lg:block w-full">
        {/* Header Section with FlickeringGrid & Integrated Realtime Search */}
        <div className="relative overflow-hidden border-b border-border/40 bg-background/50">
          <FlickeringGrid
            className="absolute inset-0 z-0 opacity-[0.25] [mask-image:radial-gradient(ellipse_at_center,white,transparent_75%)]"
            squareSize={3}
            gridGap={5}
            flickerChance={0.12}
            color="rgb(120, 120, 120)"
            maxOpacity={0.18}
          />
          <div className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              
              <div className="max-w-2xl">
                <Breadcrumb className="mb-4">
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink render={<Link href="/" />}>
                        Inicio
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>Categorías</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
                <p className="text-xs font-bold uppercase tracking-widest text-primary">
                  Explorar catálogo
                </p>
                <h1 className="mt-1 font-heading text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
                  Categorías
                </h1>
                <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                  Encuentra keys de juegos, licencias oficiales y servicios SMM organizados por categoría.
                </p>
              </div>

              {/* Desktop Filter Box */}
              <div className="w-80 relative flex-none">
                <HiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground size-5" />
                <input
                  type="text"
                  placeholder="Buscar en categorías..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-card/60 backdrop-blur-md border border-border/50 rounded-xl py-2.5 pl-11 pr-10 text-sm text-foreground placeholder:text-muted-foreground/75 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all shadow-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <HiX className="size-4" />
                  </button>
                )}
              </div>

            </div>
          </div>
        </div>

        {/* Content Section (Cards with full-bleed hover overlays & glassmorphism subcat capsules) */}
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          {filteredCategories.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredCategories.map((category) => (
                <div
                  key={category.id}
                  className="group relative h-[360px] rounded-2xl overflow-hidden border border-border/40 shadow-sm transition-all duration-500 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/25 flex flex-col justify-end bg-muted"
                >
                  {/* Full-bleed category image with zoom */}
                  {category.imageUrl ? (
                    <Image
                      src={category.imageUrl}
                      alt={category.name}
                      fill
                      unoptimized
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                      sizes="(max-width: 1024px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="size-full bg-gradient-to-tr from-muted to-background" />
                  )}

                  {/* High contrast gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/80 to-black/20 group-hover:via-black/75 transition-all duration-300" />
                  
                  {/* Subtle top indicator glow */}
                  <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  {/* Card Content container */}
                  <div className="relative p-6 z-10 w-full flex flex-col h-full justify-between">
                    
                    {/* Top row */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-white flex items-center justify-center shadow-inner">
                          <HiOutlineCollection className="size-5.5" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary-foreground bg-primary px-2.5 py-0.5 rounded-full">
                          {category.productsCount} {category.productsCount === 1 ? "Item" : "Items"}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Details & Subcategories */}
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-xl font-black text-white group-hover:text-primary transition-colors duration-300">
                          {category.name}
                        </h3>
                        {category.description && (
                          <p className="text-xs text-white/70 leading-relaxed mt-1 line-clamp-2">
                            {category.description}
                          </p>
                        )}
                      </div>

                      {/* Subcategories list as glassmorphism capsules */}
                      {category.children && category.children.length > 0 ? (
                        <div className="space-y-2">
                          <span className="text-[9px] font-black uppercase tracking-wider text-white/55">
                            Subcategorías
                          </span>
                          <div className="flex flex-wrap gap-1.5 max-h-[110px] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                            {category.children.map((subcat) => (
                              <Link
                                key={subcat.id}
                                href={`/categories/${subcat.slug}`}
                                className="text-[10px] font-extrabold text-white/90 hover:text-white hover:bg-primary border border-white/10 bg-white/5 backdrop-blur-sm rounded-full py-1 px-2.5 transition-all flex items-center gap-1.5 active:scale-95"
                              >
                                <span className="size-1 rounded-full bg-primary" />
                                <span>{subcat.name}</span>
                                <span className="text-[8px] opacity-60">({subcat.productsCount})</span>
                              </Link>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="py-2 border border-dashed border-white/10 rounded-xl bg-white/5 backdrop-blur-sm text-center">
                          <p className="text-[9px] font-semibold text-white/60">
                            Explorar categoría principal
                          </p>
                        </div>
                      )}

                      {/* Card Action Link */}
                      <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                        <Link
                          href={`/categories/${category.slug}`}
                          className="text-xs font-bold text-white hover:text-primary transition-all flex items-center gap-1 group/btn"
                        >
                          Explorar colección
                          <HiChevronRight className="size-4 transition-transform group-hover/btn:translate-x-1" />
                        </Link>
                      </div>

                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-border/40 rounded-3xl bg-muted/5">
              <HiOutlineCollection className="size-16 text-muted-foreground/20 mb-4" />
              <h2 className="text-xl font-bold text-foreground">No encontramos categorías</h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                No hay resultados para &ldquo;{searchQuery}&rdquo;. Intenta con otros términos de búsqueda.
              </p>
              <button
                onClick={() => setSearchQuery("")}
                className="mt-6 inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-md active:scale-95 transition-all"
              >
                Limpiar filtros
              </button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
