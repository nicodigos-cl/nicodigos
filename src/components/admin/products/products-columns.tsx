"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  HiOutlineClipboardCopy,
  HiOutlineDotsHorizontal,
  HiOutlinePencil,
  HiOutlineTrash,
} from "react-icons/hi";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import { ProductStatusBadge } from "@/components/admin/products/product-status-badge";
import { ProductThumbnail } from "@/components/admin/products/product-thumbnail";
import { DataTableColumnHeader } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { archiveProductAction } from "@/lib/actions/products";
import { formatMoney } from "@/lib/products/format";
import { deliveryMethodLabel } from "@/lib/products/status";
import type { ProductListItemDto } from "@/types/products";

function ProductActions({ product }: { product: ProductListItemDto }) {
  const router = useRouter();

  async function handleArchive() {
    const confirmed = window.confirm(
      `¿Archivar "${product.name}"? El producto dejará de mostrarse como activo.`,
    );
    if (!confirmed) {
      return;
    }

    const result = await archiveProductAction({ id: product.id });
    if (!result.success) {
      toast.error(result.message);
      return;
    }

    toast.success("Producto archivado");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label="Acciones" />
        }
      >
        <HiOutlineDotsHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          render={<Link href={`/admin/products/${product.id}`} />}
        >
          <HiOutlinePencil className="size-4" />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem
          render={<Link href={`/admin/products/${product.id}`} />}
        >
          Ver detalles
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            void navigator.clipboard.writeText(product.id);
            toast.success("ID copiado");
          }}
        >
          <HiOutlineClipboardCopy className="size-4" />
          Copiar ID
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => void handleArchive()}
        >
          <HiOutlineTrash className="size-4" />
          Archivar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const productsColumns: ColumnDef<ProductListItemDto>[] = [
  {
    id: "image",
    header: "",
    cell: ({ row }) => (
      <ProductThumbnail
        src={row.original.thumbnailUrl}
        alt={row.original.name}
      />
    ),
    enableSorting: false,
  },
  {
    accessorKey: "name",
    enableHiding: false,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Producto" />
    ),
    cell: ({ row }) => {
      const product = row.original;
      return (
        <div className="min-w-0 max-w-64">
          <Link
            href={`/admin/products/${product.id}`}
            className="block truncate font-medium text-foreground hover:underline"
          >
            {product.name}
          </Link>
          <p className="truncate text-xs text-muted-foreground">
            Código: {product.code}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {deliveryMethodLabel(product.deliveryMethod)}
          </p>
        </div>
      );
    },
  },
  {
    id: "category",
    header: "Categoría",
    cell: ({ row }) => {
      const categories = row.original.categories;
      if (categories.length === 0) {
        return <span className="text-muted-foreground">—</span>;
      }

      const [first, ...rest] = categories;

      return (
        <div className="flex items-center gap-1.5">
          <span className="truncate">{first.name}</span>
          {rest.length > 0 ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    className="rounded-full bg-muted px-1.5 text-xs text-muted-foreground"
                  />
                }
              >
                +{rest.length}
              </TooltipTrigger>
              <TooltipContent>
                {rest.map((category) => category.name).join(", ")}
              </TooltipContent>
            </Tooltip>
          ) : null}
        </div>
      );
    },
    enableSorting: false,
  },
  {
    id: "price",
    accessorFn: (row) => Number.parseFloat(row.price),
    enableHiding: false,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Precio base" />
    ),
    cell: ({ row }) => (
      <span className="font-medium tabular-nums">
        {formatMoney(row.original.basePrice, row.original.currency)}
      </span>
    ),
  },
  {
    id: "offer",
    header: "Oferta",
    cell: ({ row }) => {
      if (!row.original.offerPrice) {
        return <span className="text-muted-foreground">—</span>;
      }

      return (
        <span className="font-medium text-primary tabular-nums">
          {formatMoney(row.original.offerPrice, row.original.currency)}
        </span>
      );
    },
    enableSorting: false,
  },
  {
    id: "qty",
    accessorFn: (row) => row.stockAvailable,
    enableHiding: false,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Stock" />
    ),
    cell: ({ row }) => (
      <span
        className={
          row.original.stockAvailable <= 0
            ? "text-destructive"
            : "text-foreground"
        }
      >
        {row.original.stockLabel}
      </span>
    ),
  },
  {
    accessorKey: "status",
    enableHiding: false,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Estado" />
    ),
    cell: ({ row }) => (
      <ProductStatusBadge status={row.original.visualStatus} />
    ),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => <ProductActions product={row.original} />,
    enableHiding: false,
    enableSorting: false,
  },
];
