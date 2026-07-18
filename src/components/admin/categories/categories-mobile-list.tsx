"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  HiOutlineDotsHorizontal,
  HiOutlineFolder,
  HiOutlinePencil,
  HiOutlineTrash,
} from "react-icons/hi";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { deleteCategoryAction } from "@/lib/actions/categories";
import type { CategoryListItemDto } from "@/types/categories";

export function CategoriesMobileList({
  data,
}: {
  data: CategoryListItemDto[];
}) {
  const router = useRouter();

  if (data.length === 0) {
    return (
      <Empty className="border border-border bg-card">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HiOutlineFolder className="size-5" />
          </EmptyMedia>
          <EmptyTitle>Sin categorías</EmptyTitle>
          <EmptyDescription>
            No hay categorías para mostrar con los filtros actuales.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {data.map((category) => (
        <li
          key={category.id}
          className="rounded-2xl border border-border bg-card p-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link
                href={`/admin/categories/${category.id}`}
                className="block truncate font-medium hover:underline"
              >
                {category.name}
              </Link>
              <p className="truncate text-xs text-muted-foreground">
                {category.slug}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Acciones"
                  />
                }
              >
                <HiOutlineDotsHorizontal className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  render={<Link href={`/admin/categories/${category.id}`} />}
                >
                  <HiOutlinePencil className="size-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => {
                    void (async () => {
                      const confirmed = window.confirm(
                        `¿Eliminar "${category.name}"?`,
                      );
                      if (!confirmed) return;
                      const result = await deleteCategoryAction({
                        id: category.id,
                      });
                      if (!result.success) {
                        toast.error(result.message);
                        return;
                      }
                      toast.success("Categoría eliminada");
                      router.refresh();
                    })();
                  }}
                >
                  <HiOutlineTrash className="size-4" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            {category.parentName ? (
              <Badge variant="secondary">{category.parentName}</Badge>
            ) : (
              <Badge variant="outline">Raíz</Badge>
            )}
            <span className="text-muted-foreground">
              {category.productsCount} productos
            </span>
            <span className="text-muted-foreground">
              {category.childrenCount} hijas
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
