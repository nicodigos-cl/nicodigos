"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { IconDotsVertical, IconEdit, IconTrash } from "@tabler/icons-react";
import { deleteCategoryAction } from "@/lib/admin/categories/actions";
import type { AdminCategoryListItem } from "@/lib/admin/categories/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { IconCategory } from "@tabler/icons-react";

type AdminCategoriesBoardProps = {
  categories: AdminCategoryListItem[];
};

export function AdminCategoriesBoard({
  categories,
}: AdminCategoriesBoardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete(id: string, name: string) {
    if (!window.confirm(`¿Eliminar la categoría «${name}»?`)) {
      return;
    }

    startTransition(async () => {
      const result = await deleteCategoryAction(id);
      if (!result.success) {
        alert(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (categories.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <IconCategory className="size-5" />
          </EmptyMedia>
          <EmptyTitle>Sin categorías</EmptyTitle>
          <EmptyDescription>
            Crea la primera categoría para organizar el catálogo.
          </EmptyDescription>
        </EmptyHeader>
        <Button asChild>
          <Link href="/admin/categories/new">Nueva categoría</Link>
        </Button>
      </Empty>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Listado</CardTitle>
        <CardDescription>
          {categories.length} categoría{categories.length === 1 ? "" : "s"} en
          el catálogo.
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14">Img</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead className="text-right">Orden</TableHead>
              <TableHead className="text-right">Productos</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow
                key={category.id}
                className="cursor-pointer hover:bg-muted/30"
                onClick={() =>
                  router.push(`/admin/categories/${category.id}/edit`)
                }
              >
                <TableCell>
                  <div className="relative size-10 overflow-hidden rounded-lg border border-border bg-muted">
                    {category.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={category.imageUrl}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <span className="flex size-full items-center justify-center text-[10px] text-muted-foreground">
                        —
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-medium">{category.name}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {category.slug}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {category.sortOrder}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {category.productCount}
                </TableCell>
                <TableCell
                  className="text-right"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={isPending}
                        aria-label="Acciones"
                      >
                        <IconDotsVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/admin/categories/${category.id}/edit`}>
                          <IconEdit className="size-4" />
                          Editar
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() =>
                          handleDelete(category.id, category.name)
                        }
                      >
                        <IconTrash className="size-4" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
