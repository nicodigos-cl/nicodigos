"use client";

import type { OnChangeFn, RowSelectionState } from "@tanstack/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import {
  HiOutlineClipboardCopy,
  HiOutlineDotsHorizontal,
  HiOutlineTrash,
} from "react-icons/hi";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table";
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
import type { SmmServiceListItemDto } from "@/types/smm-provider";

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
  rowSelection: RowSelectionState;
  onRowSelectionChange: OnChangeFn<RowSelectionState>;
};

export function ServicesTable({
  data,
  rowSelection,
  onRowSelectionChange,
}: ServicesTableProps) {
  const selectedCount = Object.values(rowSelection).filter(Boolean).length;

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
        header: "ID",
        cell: ({ row }) => (
          <span className="tabular-nums text-muted-foreground">
            {row.original.remoteServiceId}
          </span>
        ),
      },
      {
        accessorKey: "name",
        header: "Servicio",
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
        header: "Categoría",
        cell: ({ row }) => (
          <span className="block max-w-40 truncate">{row.original.category}</span>
        ),
      },
      {
        accessorKey: "rate",
        header: "Rate",
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.rate}</span>
        ),
      },
      {
        id: "range",
        header: "Min–Max",
        cell: ({ row }) => (
          <span className="tabular-nums text-muted-foreground">
            {row.original.min}–{row.original.max}
          </span>
        ),
      },
      {
        id: "flags",
        header: "Flags",
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
      getRowId={(row) => row.id}
      emptyMessage="No hay servicios para mostrar."
    />
  );
}
