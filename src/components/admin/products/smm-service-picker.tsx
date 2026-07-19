"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { HiOutlineCheck, HiOutlineCollection } from "react-icons/hi";

import { SsrSearchInput } from "@/components/admin/ssr-search-input";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { SmmServiceListItemDto } from "@/types/smm-provider";

type SmmServicePickerProps = {
  items: SmmServiceListItemDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  q: string | undefined;
  selectedId: string | null;
  onSelect: (service: SmmServiceListItemDto) => void;
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
    params.set("serviceQ", overrides.q);
  } else {
    params.delete("serviceQ");
  }

  if (overrides.page && overrides.page > 1) {
    params.set("servicePage", String(overrides.page));
  } else {
    params.delete("servicePage");
  }

  const qs = params.toString();
  return qs ? `/admin/products/new?${qs}` : "/admin/products/new";
}

export function SmmServicePicker({
  items,
  total,
  page,
  pageSize,
  totalPages,
  q,
  selectedId,
  onSelect,
  onClear,
}: SmmServicePickerProps) {
  const router = useRouter();
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const columns: ColumnDef<SmmServiceListItemDto>[] = [
    {
      accessorKey: "name",
      header: "Servicio",
      cell: ({ row }) => (
        <div className="max-w-48">
          <p className="truncate font-medium">{row.original.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            #{row.original.remoteServiceId} · {row.original.type}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "category",
      header: "Categoría",
      cell: ({ row }) => (
        <span className="block max-w-32 truncate text-muted-foreground">
          {row.original.category}
        </span>
      ),
    },
    {
      accessorKey: "rate",
      header: "Rate USD",
      cell: ({ row }) => (
        <span className="tabular-nums">{row.original.rate}</span>
      ),
    },
    {
      accessorKey: "providerName",
      header: "Provider",
      cell: ({ row }) => (
        <span className="block max-w-28 truncate text-muted-foreground">
          {row.original.providerName}
        </span>
      ),
    },
    {
      id: "selected",
      cell: ({ row }) =>
        row.original.id === selectedId ? (
          <HiOutlineCheck className="mx-auto size-4 text-primary" />
        ) : null,
    },
  ];

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-muted/20 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">Servicio SMM</p>
          <p className="text-xs text-muted-foreground">
            Elige el servicio del panel. Se rellenan nombre, precio sugerido y
            stock (textQty).
          </p>
        </div>
        {selectedId ? (
          <Button type="button" variant="ghost" size="xs" onClick={onClear}>
            Quitar selección
          </Button>
        ) : null}
      </div>

      <SsrSearchInput
        value={q ?? ""}
        buildHref={(nextQ) => buildPickerHref({ q: nextQ, page: 1 })}
        placeholder="Buscar servicio, categoría, provider o ID..."
        aria-label="Buscar servicios SMM"
        className="w-full"
      />

      {items.length === 0 ? (
        <Empty className="rounded-xl border border-border bg-card p-8">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HiOutlineCollection className="size-5" />
            </EmptyMedia>
            <EmptyTitle>Sin servicios</EmptyTitle>
            <EmptyDescription>
              No hay servicios para mostrar. Sincroniza un provider o ajusta la
              búsqueda.
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
          getRowId={(service) => service.id}
          getRowClassName={(row) =>
            row.original.id === selectedId
              ? "cursor-pointer bg-primary/5"
              : "cursor-pointer"
          }
          onRowClick={(row) => onSelect(row.original)}
        />
      )}

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
            render={<Link href="/admin/services" />}
          >
            Ver todos
          </Button>
        </div>
      </div>
    </div>
  );
}
