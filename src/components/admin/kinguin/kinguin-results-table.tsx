"use client";

import Link from "next/link";
import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { HiOutlineDownload, HiOutlineSearch } from "react-icons/hi";

import { ImportKinguinDialog } from "@/components/admin/kinguin/import-kinguin-dialog";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { CategoryOptionDto } from "@/types/products";
import type { KinguinSearchHitDto } from "@/types/kinguin-admin";

type KinguinResultsTableProps = {
  items: KinguinSearchHitDto[];
  categories: CategoryOptionDto[];
};

function CoverThumb({ src }: { src: string | null }) {
  return (
    <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="size-full object-cover" />
      ) : null}
    </div>
  );
}

export function KinguinResultsTable({
  items,
  categories,
}: KinguinResultsTableProps) {
  const [importTarget, setImportTarget] = useState<KinguinSearchHitDto | null>(
    null,
  );
  const columns: ColumnDef<KinguinSearchHitDto>[] = [
    {
      accessorKey: "name",
      header: "Juego",
      cell: ({ row }) => (
        <div className="flex min-w-0 max-w-md items-center gap-3">
          <CoverThumb
            src={row.original.coverThumbnailUrl || row.original.coverUrl}
          />
          <div className="min-w-0">
            <p className="truncate font-medium">{row.original.name}</p>
            <p className="text-xs text-muted-foreground">
              #{row.original.kinguinId}
            </p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "platform",
      header: "Plataforma",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.platform ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "priceEur",
      header: "Precio EUR",
      cell: ({ row }) => (
        <span className="tabular-nums">
          {row.original.priceEur != null
            ? `€${row.original.priceEur.toFixed(2)}`
            : "—"}
        </span>
      ),
    },
    {
      accessorKey: "offersCount",
      header: "Ofertas",
      cell: ({ row }) => (
        <span className="tabular-nums">{row.original.offersCount}</span>
      ),
    },
    {
      accessorKey: "qty",
      header: "Stock",
      cell: ({ row }) => (
        <span className="tabular-nums">{row.original.qty}</span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="text-right">
            {item.alreadyImported && item.localProductId ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                nativeButton={false}
                render={
                  <Link href={`/admin/products/${item.localProductId}`} />
                }
              >
                Ver producto
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={() => setImportTarget(item)}
              >
                <HiOutlineDownload className="size-4" />
                Importar
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  if (items.length === 0) {
    return (
      <Empty className="border border-border bg-card">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HiOutlineSearch className="size-5" />
          </EmptyMedia>
          <EmptyTitle>Sin resultados</EmptyTitle>
          <EmptyDescription>
            No hay juegos que coincidan con esta búsqueda.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={items}
        manual
        hideToolbar
        hidePagination
        className="hidden md:flex"
        getRowId={(item) => String(item.kinguinId)}
      />

      <div className="space-y-3 md:hidden">
        {items.map((item) => (
          <div
            key={`m-${item.kinguinId}`}
            className="rounded-2xl border border-border bg-card p-3"
          >
            <div className="flex gap-3">
              <CoverThumb src={item.coverThumbnailUrl || item.coverUrl} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {item.platform ?? "—"} ·{" "}
                  {item.priceEur != null ? `€${item.priceEur.toFixed(2)}` : "—"}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  <Badge variant="secondary">{item.offersCount} ofertas</Badge>
                  <Badge variant="outline">Stock {item.qty}</Badge>
                </div>
              </div>
            </div>
            <div className="mt-3">
              {item.alreadyImported && item.localProductId ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  nativeButton={false}
                  render={
                    <Link href={`/admin/products/${item.localProductId}`} />
                  }
                >
                  Ver producto
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  className="w-full"
                  onClick={() => setImportTarget(item)}
                >
                  Importar
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <ImportKinguinDialog
        open={importTarget != null}
        onOpenChange={(open) => {
          if (!open) setImportTarget(null);
        }}
        hit={importTarget}
        categories={categories}
      />
    </>
  );
}
