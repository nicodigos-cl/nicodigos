import Image from "next/image";
import Link from "next/link";
import { IconCategory } from "@tabler/icons-react";

import { SectionShell } from "@/components/home/section-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { StorefrontCategory } from "@/lib/store/categories/queries";
import { storeRoutes } from "@/lib/store/navigation";

type CategoriesSectionProps = {
  categories: StorefrontCategory[];
};

export function CategoriesSection({ categories }: CategoriesSectionProps) {
  if (categories.length === 0) {
    return null;
  }

  return (
    <SectionShell
      id="categorias"
      eyebrow="Mira nomás"
      title="Categorías destacadas"
      description="Keys, gift cards, suscripciones y más — anda a ver qué hay pa' ti."
      href={storeRoutes.categories}
      className="py-16 sm:py-20"
    >
      <ul className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-none sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-4 sm:overflow-visible sm:pb-0">
        {categories.map((category) => (
          <li key={category.id} className="shrink-0 w-52 sm:w-auto">
            <Link
              href={storeRoutes.category(category.slug)}
              className="group block h-full"
            >
              <div className="relative aspect-[16/11] sm:aspect-[16/10] overflow-hidden rounded-2xl border border-border/80 bg-muted/10 transition-all duration-300 hover:border-primary/45 hover:shadow-md">
                {category.imageUrl ? (
                  <Image
                    src={category.imageUrl}
                    alt={category.name}
                    fill
                    unoptimized
                    sizes="(max-width:768px) 50vw, 25vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/10 via-muted to-indigo-500/10">
                    <IconCategory
                      className="size-10 text-primary/30"
                      aria-hidden
                    />
                  </div>
                )}
                
                {/* Gradient overlay inside image for better text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent transition-opacity duration-300 group-hover:from-black/90" />
                
                {/* Text Overlay content */}
                <div className="absolute inset-0 flex flex-col justify-end p-3.5 sm:p-4.5">
                  <h3 className="font-heading text-sm sm:text-base font-extrabold text-white tracking-tight uppercase group-hover:text-primary transition-colors line-clamp-1">
                    {category.name}
                  </h3>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-[10px] sm:text-xs font-bold text-gray-300">
                      {category.productCount}{" "}
                      {category.productCount === 1 ? "producto" : "productos"}
                    </p>
                    <span className="text-[10px] sm:text-xs font-black text-primary opacity-0 -translate-x-1.5 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 shrink-0">
                      Ver →
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}
