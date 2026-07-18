"use client";

import type { OnChangeFn, RowSelectionState, SortingState } from "@tanstack/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import {
  HiOutlineClipboardCopy,
  HiOutlineDotsHorizontal,
  HiOutlineTrash,
} from "react-icons/hi";
import { toast } from "sonner";

import { DataTable, DataTableColumnHeader } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteSmmServiceAction } from "@/lib/actions/smm-services";
import { SMM_SERVICE_SELECTION_LIMIT } from "@/lib/smm-services/constants";
import type {
  ServicesListQuery,
  ServicesSortField,
} from "@/lib/validations/smm-providers";
import type { SmmServiceListItemDto } from "@/types/smm-provider";

const SORTABLE_COLUMNS = new Set<ServicesSortField>([
  "remoteServiceId",
  "name",
  "category",
  "rate",
]);

function buildServicesHref(
  query: ServicesListQuery,
  sort: ServicesSortField,
  order: "asc" | "desc",
): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.pageSize !== 20) params.set("pageSize", String(query.pageSize));
  if (query.providerId) params.set("providerId", query.providerId);
  if (query.category) params.set("category", query.category);
  if (query.isActive) params.set("isActive", query.isActive);
  if (sort !== "updatedAt") params.set("sort", sort);
  if (order !== "desc") params.set("order", order);

  const qs = params.toString();
  return qs ? `/admin/services?${qs}` : "/admin/services";
}

function ServiceActions({ service }: { service: SmmServiceListItemDto }) {
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
          render={<Link href={`/admin/providers/${service.providerId}`} />}
        >
          Ver provider
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            void navigator.clipboard.writeText(String(service.remoteServiceId));
            toast.success("ID remoto copiado");
          }}
        >
          <HiOutlineClipboardCopy className="size-4" />
          Copiar ID remoto
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => {
            void (async () => {
              const confirmed = window.confirm(
                `¿Eliminar el servicio "${service.name}"?`,
              );
              if (!confirmed) return;
              const result = await deleteSmmServiceAction({ id: service.id });
              if (!result.success) {
                toast.error(result.message);
                return;
              }
              toast.success("Servicio eliminado");
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

type ServicesTableProps = {
  data: SmmServiceListItemDto[];
  query: ServicesListQuery;
  rowSelection: RowSelectionState;
  onRowSelectionChange: OnChangeFn<RowSelectionState>;
};

export function ServicesTable({
  data,
  query,
  rowSelection,
  onRowSelectionChange,
}: ServicesTableProps) {
  const router = useRouter();
  const selectedCount = Object.values(rowSelection).filter(Boolean).length;

  const sorting = useMemo<SortingState>(() => {
    if (!SORTABLE_COLUMNS.has(query.sort)) {
      return [];
    }
    return [{ id: query.sort, desc: query.order === "desc" }];
  }, [query.order, query.sort]);

  const onSortingChange = useCallback<OnChangeFn<SortingState>>(
    (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      const first = next[0];

      if (!first || !SORTABLE_COLUMNS.has(first.id as ServicesSortField)) {
        router.push(buildServicesHref(query, "updatedAt", "desc"));
        return;
      }

      router.push(
        buildServicesHref(
          query,
          first.id as ServicesSortField,
          first.desc ? "desc" : "asc",
        ),
      );
    },
    [query, router, sorting],
  );

  const columns = useMemo<ColumnDef<SmmServiceListItemDto>[]>(
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
                  if (
                    Object.values(next).filter(Boolean).length >=
                    SMM_SERVICE_SELECTION_LIMIT
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
              !row.getIsSelected() &&
              selectedCount >= SMM_SERVICE_SELECTION_LIMIT
            }
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Seleccionar fila"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "remoteServiceId",
        enableHiding: false,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="ID" />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums text-muted-foreground">
            {row.original.remoteServiceId}
          </span>
        ),
      },
      {
        accessorKey: "name",
        enableHiding: false,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Servicio" />
        ),
        cell: ({ row }) => (
          <div className="min-w-0 max-w-72">
            <p className="truncate font-medium">{row.original.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {row.original.type}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "providerName",
        header: "Provider",
        enableSorting: false,
        cell: ({ row }) => (
          <Link
            href={`/admin/providers/${row.original.providerId}`}
            className="block max-w-40 truncate text-sm hover:underline"
          >
            {row.original.providerName}
          </Link>
        ),
      },
      {
        accessorKey: "category",
        enableHiding: false,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Categoría" />
        ),
        cell: ({ row }) => (
          <span className="block max-w-40 truncate">{row.original.category}</span>
        ),
      },
      {
        id: "rate",
        accessorFn: (row) => Number.parseFloat(row.rate),
        enableHiding: false,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Rate" />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.rate}</span>
        ),
      },
      {
        id: "range",
        header: "Min–Max",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="tabular-nums text-muted-foreground">
            {row.original.min}–{row.original.max}
          </span>
        ),
      },
      {
        id: "flags",
        header: "Flags",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.isActive ? (
              <Badge variant="default">Activo</Badge>
            ) : (
              <Badge variant="secondary">Inactivo</Badge>
            )}
            {row.original.refill ? (
              <Badge variant="outline">Refill</Badge>
            ) : null}
            {row.original.cancel ? (
              <Badge variant="outline">Cancel</Badge>
            ) : null}
          </div>
        ),
      },
      {
        id: "actions",
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => <ServiceActions service={row.original} />,
      },
    ],
    [onRowSelectionChange, rowSelection, selectedCount],
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      manual
      hideToolbar
      hidePagination
      enableRowSelection
      rowSelection={rowSelection}
      onRowSelectionChange={onRowSelectionChange}
      sorting={sorting}
      onSortingChange={onSortingChange}
      getRowId={(row) => row.id}
      emptyMessage="No hay servicios para mostrar."
    />
  );
}
