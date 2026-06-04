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
      description="Juegos, gift cards, suscripciones y más — anda a ver qué hay pa' ti."
      href={storeRoutes.categories}
      className="py-16 sm:py-20"
    >
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {categories.map((category) => (
          <li key={category.id}>
            <Link
              href={storeRoutes.category(category.slug)}
              className="block h-full"
            >
              <Card
                size="sm"
                className="h-full overflow-hidden py-0 transition-all duration-300 hover:ring-primary/30"
              >
                <div className="relative aspect-[16/9] bg-muted/40">
                  {category.imageUrl ? (
                    <Image
                      src={category.imageUrl}
                      alt=""
                      fill
                      unoptimized
                      sizes="(max-width:768px) 50vw, 25vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <IconCategory
                        className="size-10 text-muted-foreground/40"
                        aria-hidden
                      />
                    </div>
                  )}
                </div>
                <CardHeader className="px-4 pt-4 pb-0">
                  <CardTitle className="text-base font-bold">
                    {category.name}
                  </CardTitle>
                  {category.description ? (
                    <CardDescription className="line-clamp-2 text-xs">
                      {category.description}
                    </CardDescription>
                  ) : null}
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-2">
                  <p className="text-xs font-semibold text-primary tabular-nums">
                    {category.productCount}{" "}
                    {category.productCount === 1 ? "producto" : "productos"}
                  </p>
                </CardContent>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}
