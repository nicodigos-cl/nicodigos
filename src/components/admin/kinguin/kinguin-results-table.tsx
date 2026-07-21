"use client";

import Link from "next/link";
import { useMemo } from "react";
import type {
  ColumnDef,
  OnChangeFn,
  RowSelectionState,
} from "@tanstack/react-table";
import { HiOutlineDownload, HiOutlineSearch } from "react-icons/hi";

import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { KINGUIN_SELECTION_LIMIT } from "@/lib/smm-services/constants";
import type { KinguinSearchHitDto } from "@/types/kinguin-admin";

type KinguinResultsTableProps = {
  items: KinguinSearchHitDto[];
  rowSelection: RowSelectionState;
  onRowSelectionChange: OnChangeFn<RowSelectionState>;
  onImportOne: (hit: KinguinSearchHitDto) => void;
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
  rowSelection,
  onRowSelectionChange,
  onImportOne,
}: KinguinResultsTableProps) {
  const selectedCount = Object.values(rowSelection).filter(Boolean).length;

  const columns = useMemo<ColumnDef<KinguinSearchHitDto>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            indeterminate={
              table.getIsSomePageRowsSelected() &&
              !table.getIsAllPageRowsSelected()
            }
            onCheckedChange={(value) => {
              if (value) {
                const next: RowSelectionState = { ...rowSelection };
                for (const row of table.getRowModel().rows) {
                  if (row.original.alreadyImported) continue;
                  if (
                    Object.values(next).filter(Boolean).length >=
                    KINGUIN_SELECTION_LIMIT
                  ) {
                    break;
                  }
                  next[row.id] = true;
                }
                onRowSelectionChange(next);
                return;
              }
              table.toggleAllPageRowsSelected(false);
            }}
            aria-label="Seleccionar página"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            disabled={
              row.original.alreadyImported ||
              (!row.getIsSelected() &&
                selectedCount >= KINGUIN_SELECTION_LIMIT)
            }
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Seleccionar fila"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
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
                  onClick={() => onImportOne(item)}
                >
                  <HiOutlineDownload className="size-4" />
                  Importar
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [onImportOne, onRowSelectionChange, rowSelection, selectedCount],
  );

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
        enableRowSelection
        rowSelection={rowSelection}
        onRowSelectionChange={onRowSelectionChange}
        getRowId={(item) => String(item.kinguinId)}
      />

      <div className="space-y-3 md:hidden">
        {items.map((item) => {
          const rowId = String(item.kinguinId);
          const isSelected = Boolean(rowSelection[rowId]);
          const atLimit =
            !isSelected && selectedCount >= KINGUIN_SELECTION_LIMIT;

          return (
            <div
              key={`m-${item.kinguinId}`}
              className="rounded-2xl border border-border bg-card p-3"
            >
              <div className="flex gap-3">
                {!item.alreadyImported ? (
                  <Checkbox
                    className="mt-1"
                    checked={isSelected}
                    disabled={atLimit}
                    onCheckedChange={(value) => {
                      const next = { ...rowSelection };
                      if (value) {
                        next[rowId] = true;
                      } else {
                        delete next[rowId];
                      }
                      onRowSelectionChange(next);
                    }}
                    aria-label={`Seleccionar ${item.name}`}
                  />
                ) : null}
                <CoverThumb src={item.coverThumbnailUrl || item.coverUrl} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.platform ?? "—"} ·{" "}
                    {item.priceEur != null
                      ? `€${item.priceEur.toFixed(2)}`
                      : "—"}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge variant="secondary">
                      {item.offersCount} ofertas
                    </Badge>
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
                    onClick={() => onImportOne(item)}
                  >
                    Importar
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
