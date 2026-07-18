"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  HiOutlineClipboardCopy,
  HiOutlineDotsHorizontal,
  HiOutlinePencil,
  HiOutlineTrash,
} from "react-icons/hi";
import { toast } from "sonner";

import { ProductStatusBadge } from "@/components/admin/products/product-status-badge";
import { ProductThumbnail } from "@/components/admin/products/product-thumbnail";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { archiveProductAction } from "@/lib/actions/products";
import { formatMoney } from "@/lib/products/format";
import type { ProductListItemDto } from "@/types/products";

type ProductsMobileListProps = {
  data: ProductListItemDto[];
};

export function ProductsMobileList({ data }: ProductsMobileListProps) {
  const router = useRouter();

  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
        No hay productos para mostrar.
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {data.map((product) => (
        <li
          key={product.id}
          className="rounded-2xl border border-border bg-card p-3"
        >
          <div className="flex gap-3">
            <ProductThumbnail
              src={product.thumbnailUrl}
              alt={product.name}
              size={48}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link
                    href={`/admin/products/${product.id}`}
                    className="block truncate font-medium hover:underline"
                  >
                    {product.name}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">
                    {product.categories[0]?.name ?? "Sin categoría"}
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
                      render={<Link href={`/admin/products/${product.id}`} />}
                    >
                      <HiOutlinePencil className="size-4" />
                      Editar
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
                      onClick={() => {
                        void (async () => {
                          const confirmed = window.confirm(
                            `¿Archivar "${product.name}"?`,
                          );
                          if (!confirmed) return;
                          const result = await archiveProductAction({
                            id: product.id,
                          });
                          if (!result.success) {
                            toast.error(result.message);
                            return;
                          }
                          toast.success("Producto archivado");
                          router.refresh();
                        })();
                      }}
                    >
                      <HiOutlineTrash className="size-4" />
                      Archivar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
                <span className="font-medium tabular-nums">
                  {formatMoney(product.basePrice, product.currency)}
                </span>
                {product.offerPrice ? (
                  <span className="font-medium text-primary tabular-nums">
                    {formatMoney(product.offerPrice, product.currency)}
                  </span>
                ) : null}
                <span
                  className={
                    product.stockAvailable <= 0
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }
                >
                  {product.stockLabel}
                </span>
                <ProductStatusBadge status={product.visualStatus} />
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
