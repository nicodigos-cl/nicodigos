import Image from "next/image";
import Link from "next/link";

import { buildCatalogHref } from "@/lib/catalog/url";
import { cn } from "@/lib/utils";
import type { StoreCatalogQuery } from "@/lib/validations/catalog";
import type { StoreNavCategoryDto } from "@/types/categories";

type CatalogCategoryChipsProps = {
  categories: StoreNavCategoryDto[];
  query: StoreCatalogQuery;
  className?: string;
};

export function CatalogCategoryChips({
  categories,
  query,
  className,
}: CatalogCategoryChipsProps) {
  if (categories.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Categorías rápidas"
      className={cn("relative", className)}
    >
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
        <Link
          href={buildCatalogHref(query, { category: undefined, page: 1 })}
          className={cn(
            "inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors sm:text-sm",
            !query.category
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border/70 bg-background/80 text-foreground hover:border-primary/40 hover:bg-muted/60",
          )}
        >
          Todas
        </Link>

        {categories.map((category) => {
          const active = query.category === category.slug;
          return (
            <Link
              key={category.id}
              href={buildCatalogHref(query, {
                category: active ? undefined : category.slug,
                page: 1,
              })}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors sm:text-sm",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/70 bg-background/80 text-foreground hover:border-primary/40 hover:bg-muted/60",
              )}
            >
              {category.imageUrl ? (
                <span className="relative size-5 overflow-hidden rounded-full bg-muted ring-1 ring-border/60">
                  <Image
                    src={category.imageUrl}
                    alt=""
                    fill
                    unoptimized
                    className="object-cover"
                    sizes="20px"
                  />
                </span>
              ) : null}
              {category.name}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
