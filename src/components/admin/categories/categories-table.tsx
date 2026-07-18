"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import {
  HiOutlineClipboardCopy,
  HiOutlineDotsHorizontal,
  HiOutlinePencil,
  HiOutlineTrash,
} from "react-icons/hi";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteCategoryAction } from "@/lib/actions/categories";
import { formatDateTime } from "@/lib/format-date";
import type { CategoryListItemDto } from "@/types/categories";

function CategoryActions({ category }: { category: CategoryListItemDto }) {
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label="Acciones" />}
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
        <DropdownMenuItem
          onClick={() => {
            void navigator.clipboard.writeText(category.id);
            toast.success("ID copiado");
          }}
        >
          <HiOutlineClipboardCopy className="size-4" />
          Copiar ID
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => {
            void (async () => {
              const confirmed = window.confirm(
                `¿Eliminar la categoría "${category.name}"? Los productos asociados se desvincularán.`,
              );
              if (!confirmed) return;
              const result = await deleteCategoryAction({ id: category.id });
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
  );
}

export const categoriesColumns: ColumnDef<CategoryListItemDto>[] = [
  {
    accessorKey: "name",
    header: "Categoría",
    cell: ({ row }) => {
      const category = row.original;
      return (
        <div className="min-w-0 max-w-72">
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
      );
    },
  },
  {
    id: "parent",
    header: "Padre",
    cell: ({ row }) =>
      row.original.parentName ? (
        <Badge variant="secondary">{row.original.parentName}</Badge>
      ) : (
        <span className="text-sm text-muted-foreground">Raíz</span>
      ),
  },
  {
    id: "products",
    header: "Productos",
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.productsCount}</span>
    ),
  },
  {
    id: "children",
    header: "Hijas",
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.childrenCount}</span>
    ),
  },
  {
    id: "updated",
    header: "Actualizada",
    cell: ({ row }) => formatDateTime(row.original.updatedAt),
  },
  {
    id: "actions",
    cell: ({ row }) => <CategoryActions category={row.original} />,
  },
];

export function CategoriesTable({ data }: { data: CategoryListItemDto[] }) {
  return (
    <DataTable
      columns={categoriesColumns}
      data={data}
      manual
      hideToolbar
      hidePagination
      emptyMessage="No hay categorías para mostrar."
    />
  );
}
