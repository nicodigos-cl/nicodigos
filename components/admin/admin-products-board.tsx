"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  IconDotsVertical,
  IconEdit,
  IconPackage,
  IconSearch,
  IconEye,
  IconEyeOff,
  IconDiscount2,
  IconStar,
  IconCalendarTime,
  IconLoader2,
  IconX,
  IconChevronLeft,
  IconChevronRight,
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
import { Checkbox } from "@/components/ui/checkbox";
import { bulkUpdateProductsAction } from "@/lib/admin/products/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type AdminProductsBoardProps = {
  products: AdminProductListItem[];
  total: number;
  page: number;
  totalPages: number;
  search: string;
  stats: {
    total: number;
    active: number;
    drafts: number;
    lowStock: number;
  };
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

export function AdminProductsBoard({
  products,
  total,
  page,
  totalPages,
  search,
  stats,
}: AdminProductsBoardProps) {
  const router = useRouter();
  const [query, setQuery] = useState(search);
  const [prevSearch, setPrevSearch] = useState(search);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  const filtered = products;

  // Sync state when prop updates from outside (like page back/forward or sidebar click)
  if (search !== prevSearch) {
    setPrevSearch(search);
    setQuery(search);
  }

  // Debounced URL updates when typing
  const debouncedSearch = useMemo(() => {
    let timeoutId: any;
    return (value: string) => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const params = new URLSearchParams(window.location.search);
        if (value.trim()) {
          params.set("search", value.trim());
        } else {
          params.delete("search");
        }
        params.set("page", "1");
        router.push(`/admin/products?${params.toString()}`);
      }, 400);
    };
  }, [router]);

  const handleSearchChange = (val: string) => {
    setQuery(val);
    debouncedSearch(val);
  };

  function handlePageChange(newPage: number) {
    const params = new URLSearchParams(window.location.search);
    params.set("page", newPage.toString());
    router.push(`/admin/products?${params.toString()}`);
  }

  function getPageNumbers() {
    const pages: number[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (page > 3) {
        pages.push(-1);
      }

      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (page < totalPages - 2) {
        pages.push(-1);
      }

      pages.push(totalPages);
    }

    return pages;
  }

  const allSelected = filtered.length > 0 && filtered.every((p) => selectedIds.includes(p.id));
  const someSelected = filtered.some((p) => selectedIds.includes(p.id)) && !allSelected;
  const headerCheckedState = allSelected ? true : someSelected ? "indeterminate" : false;

  function goToEdit(productId: string) {
    router.push(`/admin/products/${productId}/edit`);
  }

  function handleBulkUpdate(updates: {
    isActive?: boolean;
    isOffer?: boolean;
    isFeatured?: boolean;
    isPreorder?: boolean;
  }) {
    startTransition(async () => {
      const toastId = toast.loading("Actualizando productos...");
      const res = await bulkUpdateProductsAction(selectedIds, updates);
      if (res.success) {
        toast.success(res.message || "Productos actualizados con éxito", {
          id: toastId,
        });
        setSelectedIds([]);
      } else {
        toast.error(res.error, { id: toastId });
      }
    });
  }

  if (stats.total === 0) {
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
                onChange={(e) => handleSearchChange(e.target.value)}
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
                  <TableHead className="w-12 pl-6">
                    <Checkbox
                      checked={headerCheckedState}
                      onCheckedChange={(checked) => {
                        if (checked === true) {
                          setSelectedIds(filtered.map((p) => p.id));
                        } else {
                          setSelectedIds([]);
                        }
                      }}
                      aria-label="Seleccionar todos"
                    />
                  </TableHead>
                  <TableHead className="min-w-56 pl-2">Producto</TableHead>
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
                  const isSelected = selectedIds.includes(product.id);

                  return (
                    <TableRow
                      key={product.id}
                      className={cn(
                        "cursor-pointer transition-colors",
                        isSelected && "bg-muted/40 hover:bg-muted/50",
                      )}
                      onClick={() => goToEdit(product.id)}
                    >
                      <TableCell className="w-12 pl-6" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            setSelectedIds((prev) =>
                              checked
                                ? [...prev, product.id]
                                : prev.filter((id) => id !== product.id),
                            );
                          }}
                          aria-label={`Seleccionar ${product.name}`}
                        />
                      </TableCell>
                      <TableCell className="max-w-xs whitespace-normal pl-2">
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
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-6 py-4">
            <div className="flex flex-1 justify-between sm:hidden">
              <Button
                variant="outline"
                disabled={page <= 1}
                onClick={() => handlePageChange(page - 1)}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => handlePageChange(page + 1)}
              >
                Siguiente
              </Button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Mostrando página <span className="font-semibold text-foreground">{page}</span> de{" "}
                  <span className="font-semibold text-foreground">{totalPages}</span> ({total} productos en total)
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-full shadow-xs" aria-label="Pagination">
                  <Button
                    variant="outline"
                    className="rounded-l-full px-3 h-9"
                    disabled={page <= 1}
                    onClick={() => handlePageChange(page - 1)}
                  >
                    <IconChevronLeft className="size-4" />
                    <span className="sr-only">Anterior</span>
                  </Button>
                  
                  {getPageNumbers().map((p, idx) => {
                    if (p === -1) {
                      return (
                        <span
                          key={`ellipsis-${idx}`}
                          className="inline-flex items-center px-4 text-sm font-semibold text-muted-foreground select-none"
                        >
                          ...
                        </span>
                      );
                    }
                    return (
                      <Button
                        key={p}
                        variant={p === page ? "default" : "outline"}
                        className={cn(
                          "h-9 px-4 font-semibold text-sm rounded-none border-x-0 first:border-l last:border-r",
                          p === page && "z-10",
                        )}
                        onClick={() => handlePageChange(p)}
                      >
                        {p}
                      </Button>
                    );
                  })}

                  <Button
                    variant="outline"
                    className="rounded-r-full px-3 h-9"
                    disabled={page >= totalPages}
                    onClick={() => handlePageChange(page + 1)}
                  >
                    <IconChevronRight className="size-4" />
                    <span className="sr-only">Siguiente</span>
                  </Button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Floating Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 flex-col gap-3 rounded-2xl border border-border/80 bg-background/85 px-4 py-3.5 shadow-xl shadow-black/5 backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 sm:flex-row sm:items-center sm:gap-4 sm:rounded-full sm:px-6 sm:py-3">
          <div className="flex items-center justify-between gap-2 max-sm:w-full sm:border-r sm:border-border sm:pr-4 text-sm font-medium">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground tabular-nums">
                {selectedIds.length}
              </span>
              <span className="text-muted-foreground text-xs sm:text-sm">
                seleccionado{selectedIds.length === 1 ? "" : "s"}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              disabled={isPending}
              onClick={() => setSelectedIds([])}
              className="h-8 w-8 rounded-full hover:bg-muted sm:hidden"
              title="Cancelar selección"
            >
              <IconX className="size-4" />
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2 max-sm:justify-center">
            <Button
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => handleBulkUpdate({ isActive: true })}
              className="h-8 gap-1.5 rounded-full text-xs font-semibold hover:bg-accent"
            >
              {isPending ? (
                <IconLoader2 className="size-3.5 animate-spin" />
              ) : (
                <IconEye className="size-3.5 text-emerald-500" />
              )}
              Publicar
            </Button>

            <Button
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => handleBulkUpdate({ isActive: false })}
              className="h-8 gap-1.5 rounded-full text-xs font-semibold hover:bg-accent"
            >
              {isPending ? (
                <IconLoader2 className="size-3.5 animate-spin" />
              ) : (
                <IconEyeOff className="size-3.5 text-amber-500" />
              )}
              Desactivar
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  className="h-8 rounded-full text-xs font-semibold hover:bg-accent"
                >
                  Más acciones...
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => handleBulkUpdate({ isFeatured: true })}
                  className="cursor-pointer"
                >
                  <IconStar className="mr-2 size-4 text-amber-500 fill-amber-500" />
                  Destacar en Inicio
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleBulkUpdate({ isFeatured: false })}
                  className="cursor-pointer"
                >
                  <IconStar className="mr-2 size-4 text-muted-foreground" />
                  Quitar de Inicio
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleBulkUpdate({ isOffer: true })}
                  className="cursor-pointer"
                >
                  <IconDiscount2 className="mr-2 size-4 text-emerald-500" />
                  Marcar como Oferta
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleBulkUpdate({ isOffer: false })}
                  className="cursor-pointer"
                >
                  <IconDiscount2 className="mr-2 size-4 text-muted-foreground" />
                  Quitar de Oferta
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleBulkUpdate({ isPreorder: true })}
                  className="cursor-pointer"
                >
                  <IconCalendarTime className="mr-2 size-4 text-blue-500" />
                  Marcar como Preorden
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleBulkUpdate({ isPreorder: false })}
                  className="cursor-pointer"
                >
                  <IconCalendarTime className="mr-2 size-4 text-muted-foreground" />
                  Quitar de Preorden
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="icon"
              disabled={isPending}
              onClick={() => setSelectedIds([])}
              className="h-8 w-8 max-sm:hidden rounded-full hover:bg-muted"
              title="Cancelar selección"
            >
              <IconX className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
