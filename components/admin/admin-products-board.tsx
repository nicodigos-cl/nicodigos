"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  IconDotsVertical,
  IconEdit,
  IconPackage,
  IconSearch,
} from "@tabler/icons-react";
import type { AdminProductListItem } from "@/lib/admin/products/types";
import { formatMoney, formatSourceMoney } from "@/lib/admin/format";
import { Badge } from "@/components/ui/badge";
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
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type AdminProductsBoardProps = {
  products: AdminProductListItem[];
};

function marginPercent(cost: string, sell: string): number | null {
  const costNum = Number(cost);
  const sellNum = Number(sell);
  if (!Number.isFinite(costNum) || !Number.isFinite(sellNum) || costNum <= 0) {
    return null;
  }
  return Math.round(((sellNum - costNum) / costNum) * 100);
}

function productStatusLabel(isActive: boolean): string {
  return isActive ? "Activo" : "Borrador";
}

export function AdminProductsBoard({ products }: AdminProductsBoardProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return products;
    }
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.platform.toLowerCase().includes(q) ||
        String(p.kinguinId).includes(q) ||
        p.slug.toLowerCase().includes(q),
    );
  }, [products, query]);

  const stats = useMemo(() => {
    const active = products.filter((p) => p.isActive).length;
    const drafts = products.length - active;
    const lowStock = products.filter((p) => p.qty < 5).length;
    return { total: products.length, active, drafts, lowStock };
  }, [products]);

  function goToEdit(productId: string) {
    router.push(`/admin/products/${productId}/edit`);
  }

  if (products.length === 0) {
    return (
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <IconPackage />
          </EmptyMedia>
          <EmptyTitle>Sin productos en el catálogo</EmptyTitle>
          <EmptyDescription>
            Importa tu primer producto desde Kinguin para empezar a venderlo en
            la tienda.
          </EmptyDescription>
        </EmptyHeader>
        <Button asChild>
          <Link href="/admin/products/new">Importar desde Kinguin</Link>
        </Button>
      </Empty>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {stats.total}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Activos</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {stats.active}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Borradores</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {stats.drafts}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Stock bajo</CardDescription>
            <CardTitle className="text-2xl tabular-nums text-amber-600">
              {stats.lowStock}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Catálogo</CardTitle>
            <CardDescription>
              Haz clic en un producto para abrir su página de edición.
            </CardDescription>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <InputGroup className="sm:w-64">
              <InputGroupAddon>
                <IconSearch className="size-4" />
              </InputGroupAddon>
              <InputGroupInput
                placeholder="Buscar por nombre, plataforma…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </InputGroup>
            <Button asChild>
              <Link href="/admin/products/new">Nuevo producto</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {filtered.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">
              Ningún producto coincide con &quot;{query}&quot;.
            </p>
          ) : (
            <Table className="min-w-4xl">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="min-w-56 pl-6">Producto</TableHead>
                  <TableHead className="w-28">Plataforma</TableHead>
                  <TableHead className="w-16 text-right">Stock</TableHead>
                  <TableHead className="hidden w-28 text-right lg:table-cell">
                    Costo EUR
                  </TableHead>
                  <TableHead className="hidden w-32 text-right md:table-cell">
                    Costo CLP
                  </TableHead>
                  <TableHead className="w-32 text-right">Venta CLP</TableHead>
                  <TableHead className="hidden w-20 text-right md:table-cell">
                    Margen
                  </TableHead>
                  <TableHead className="w-28">Estado</TableHead>
                  <TableHead className="w-12 pr-6 text-right">
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((product) => {
                  const margin = marginPercent(
                    product.costPrice,
                    product.sellPrice,
                  );

                  return (
                    <TableRow
                      key={product.id}
                      className="cursor-pointer transition-colors"
                      onClick={() => goToEdit(product.id)}
                    >
                      <TableCell className="max-w-xs whitespace-normal pl-6">
                        <div className="flex items-center gap-3 py-1">
                          {product.coverImageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={product.coverImageUrl}
                              alt=""
                              className="size-11 shrink-0 rounded-xl border border-border/60 object-cover"
                            />
                          ) : (
                            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-dashed border-border bg-muted/50">
                              <IconPackage className="size-5 text-muted-foreground" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="truncate font-medium leading-snug">
                              {product.name}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                              #{product.kinguinId} · {product.offerCount} oferta
                              {product.offerCount === 1 ? "" : "s"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {product.platform}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <span
                          className={cn(
                            product.qty < 5 && "font-medium text-amber-600",
                          )}
                        >
                          {product.qty}
                        </span>
                      </TableCell>
                      <TableCell className="hidden text-right tabular-nums text-muted-foreground lg:table-cell">
                        {product.sourceCostPrice
                          ? formatSourceMoney(
                              product.sourceCostPrice,
                              product.sourceCurrency,
                            )
                          : "—"}
                      </TableCell>
                      <TableCell className="hidden text-right tabular-nums text-muted-foreground md:table-cell">
                        {formatMoney(product.costPrice)}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatMoney(product.sellPrice)}
                      </TableCell>
                      <TableCell className="hidden text-right md:table-cell">
                        {margin != null ? (
                          <Badge
                            variant={margin >= 15 ? "default" : "secondary"}
                          >
                            +{margin}%
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          <Badge
                            variant={product.isActive ? "default" : "outline"}
                          >
                            {productStatusLabel(product.isActive)}
                          </Badge>
                          {product.isPreorder ? (
                            <Badge variant="outline">Preorder</Badge>
                          ) : null}
                          {product.isOffer ? (
                            <Badge variant="secondary">Oferta</Badge>
                          ) : null}
                          {product.isFeatured ? (
                            <Badge variant="secondary">Inicio</Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell
                        className="pr-6 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                            >
                              <IconDotsVertical className="size-4" />
                              <span className="sr-only">Acciones</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/products/${product.id}/edit`}>
                                <IconEdit className="size-4" />
                                Editar
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                              <Link href="/admin/products/new">
                                Importar otro
                              </Link>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
