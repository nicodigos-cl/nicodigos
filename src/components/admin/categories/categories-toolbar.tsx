"use client";

import { CreateCategoryDialog } from "@/components/admin/categories/create-category-dialog";
import { SsrSearchInput } from "@/components/admin/ssr-search-input";
import type { CategoryParentOptionDto } from "@/types/categories";

type CategoriesToolbarProps = {
  q?: string;
  parentOptions: CategoryParentOptionDto[];
};

function buildHref(q: string | undefined): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  const qs = params.toString();
  return qs ? `/admin/categories?${qs}` : "/admin/categories";
}

export function CategoriesToolbar({
  q,
  parentOptions,
}: CategoriesToolbarProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Categorías
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Organiza el catálogo en un árbol. Arrastra para reordenar hermanos.
          </p>
        </div>
        <CreateCategoryDialog parentOptions={parentOptions} />
      </div>

      <SsrSearchInput
        value={q ?? ""}
        buildHref={(nextQ) => buildHref(nextQ || undefined)}
        placeholder="Buscar categorías..."
        aria-label="Buscar categorías"
        className="w-full max-w-sm sm:w-72"
      />
    </div>
  );
}
