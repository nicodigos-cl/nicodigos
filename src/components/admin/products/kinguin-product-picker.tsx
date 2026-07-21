"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { HiOutlineCheck, HiOutlineSearch } from "react-icons/hi";

import { SsrSearchInput } from "@/components/admin/ssr-search-input";
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
import type { KinguinSearchHitDto } from "@/types/kinguin-admin";

type KinguinProductPickerProps = {
  items: KinguinSearchHitDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  q: string | undefined;
  selectedKinguinId: number | null;
  onSelect: (hit: KinguinSearchHitDto) => void;
  onClear: () => void;
};

function buildPickerHref(overrides: {
  q?: string | undefined;
  page?: number;
}): string {
  const params = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : "",
  );

  if (overrides.q) {
    params.set("kinguinQ", overrides.q);
  } else {
    params.delete("kinguinQ");
  }

  if (overrides.page && overrides.page > 1) {
    params.set("kinguinPage", String(overrides.page));
  } else {
    params.delete("kinguinPage");
  }

  const qs = params.toString();
  return qs ? `/admin/products/new?${qs}` : "/admin/products/new";
}

function CoverThumb({ src }: { src: string | null }) {
  return (
    <div className="relative size-9 shrink-0 overflow-hidden rounded-lg bg-muted">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="size-full object-cover" />
      ) : null}
    </div>
  );
}

export function KinguinProductPicker({
  items,
  total,
  page,
  pageSize,
  totalPages,
  q,
  selectedKinguinId,
  onSelect,
  onClear,
}: KinguinProductPickerProps) {
  const router = useRouter();
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const hasQuery = Boolean(q?.trim());
  const columns: ColumnDef<KinguinSearchHitDto>[] = [
    {
      accessorKey: "name",
      header: "Juego",
      cell: ({ row }) => (
        <div className="flex min-w-0 max-w-52 items-center gap-2">
          <CoverThumb
            src={row.original.coverThumbnailUrl || row.original.coverUrl}
          />
          <div className="min-w-0">
            <p className="truncate font-medium">{row.original.name}</p>
            <p className="truncate text-xs text-muted-foreground">
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
        <span className="block max-w-24 truncate text-muted-foreground">
          {row.original.platform ?? "—"}
        </span>
      ),
    },
    {
      id: "chile",
      header: "Chile",
      cell: ({ row }) =>
        row.original.chileCompatible ? (
          <Badge variant="outline" className="text-[10px]">
            OK
          </Badge>
        ) : (
          <Badge variant="destructive" className="text-[10px]">
            No
          </Badge>
        ),
    },
    {
      accessorKey: "priceEur",
      header: "EUR",
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
      id: "selected",
      cell: ({ row }) =>
        row.original.alreadyImported && row.original.localProductId ? (
          <Badge variant="secondary" className="text-[10px]">
            Ya importado
          </Badge>
        ) : row.original.kinguinId === selectedKinguinId ? (
          <HiOutlineCheck className="mx-auto size-4 text-primary" />
        ) : null,
    },
  ];

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-muted/20 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">Producto Kinguin</p>
          <p className="text-xs text-muted-foreground">
            Busca y enlaza el juego remoto. Se rellenan nombre, precio sugerido
            y stock.
          </p>
        </div>
        {selectedKinguinId != null ? (
          <Button type="button" variant="ghost" size="xs" onClick={onClear}>
            Quitar selección
          </Button>
        ) : null}
      </div>

      <SsrSearchInput
        value={q ?? ""}
        buildHref={(nextQ) => buildPickerHref({ q: nextQ, page: 1 })}
        placeholder="Buscar por nombre en Kinguin..."
        aria-label="Buscar productos Kinguin"
        className="w-full"
      />

      {!hasQuery ? (
        <Empty className="rounded-xl border border-border bg-card p-8">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HiOutlineSearch className="size-5" />
            </EmptyMedia>
            <EmptyTitle>Busca un juego</EmptyTitle>
            <EmptyDescription>
              Escribe un nombre para consultar el catálogo de Kinguin y
              enlazarlo a este producto.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : items.length === 0 ? (
        <Empty className="rounded-xl border border-border bg-card p-8">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HiOutlineSearch className="size-5" />
            </EmptyMedia>
            <EmptyTitle>Sin resultados</EmptyTitle>
            <EmptyDescription>
              No hay juegos que coincidan con “{q}”.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <DataTable
          columns={columns}
          data={items}
          manual
          hideToolbar
          hidePagination
          containerClassName="rounded-xl"
          tableContainerClassName="max-h-64 overflow-auto"
          headerClassName="sticky top-0 z-10 bg-muted/80 backdrop-blur"
          getRowId={(hit) => String(hit.kinguinId)}
          getRowClassName={(row) => {
            if (row.original.alreadyImported) return "opacity-60";
            return row.original.kinguinId === selectedKinguinId
              ? "cursor-pointer bg-primary/5"
              : "cursor-pointer";
          }}
          onRowClick={(row) => {
            if (!row.original.alreadyImported) onSelect(row.original);
          }}
        />
      )}

      {hasQuery ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            {total === 0 ? "0 resultados" : `${from}–${to} de ${total}`}
          </span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="xs"
              disabled={page <= 1}
              onClick={() =>
                router.push(buildPickerHref({ q, page: Math.max(1, page - 1) }))
              }
            >
              Anterior
            </Button>
            <Button
              type="button"
              variant="outline"
              size="xs"
              disabled={page >= totalPages}
              onClick={() =>
                router.push(
                  buildPickerHref({ q, page: Math.min(totalPages, page + 1) }),
                )
              }
            >
              Siguiente
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              nativeButton={false}
              render={<Link href="/admin/kinguin" />}
            >
              Catálogo
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
