"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import {
  HiOutlineClipboardCopy,
  HiOutlineDotsHorizontal,
  HiOutlinePencil,
  HiOutlineRefresh,
  HiOutlineTrash,
} from "react-icons/hi";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table";
import { confirmDialog } from "@/components/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  deleteSmmProviderAction,
  syncSmmProviderServicesAction,
} from "@/lib/actions/smm-providers";
import { formatDateTime } from "@/lib/format-date";
import type { SmmProviderListItemDto } from "@/types/smm-provider";

function statusLabel(status: SmmProviderListItemDto["status"]): string {
  switch (status) {
    case "ACTIVE":
      return "Activo";
    case "INACTIVE":
      return "Inactivo";
    case "ERROR":
      return "Error";
  }
}

function statusVariant(
  status: SmmProviderListItemDto["status"],
): "default" | "secondary" | "destructive" {
  switch (status) {
    case "ACTIVE":
      return "default";
    case "INACTIVE":
      return "secondary";
    case "ERROR":
      return "destructive";
  }
}

function ProviderActions({ provider }: { provider: SmmProviderListItemDto }) {
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
          render={<Link href={`/admin/providers/${provider.id}`} />}
        >
          <HiOutlinePencil className="size-4" />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            void navigator.clipboard.writeText(provider.id);
            toast.success("ID copiado");
          }}
        >
          <HiOutlineClipboardCopy className="size-4" />
          Copiar ID
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            void (async () => {
              const result = await syncSmmProviderServicesAction({
                id: provider.id,
              });
              if (!result.success) {
                toast.error(result.message);
                return;
              }
              toast.success(
                `Sincronizados ${result.data.synced} · retirados ${result.data.removed} · archivados ${result.data.archivedProducts} · tasas cambiadas ${result.data.rateChanges}`,
              );
              router.refresh();
            })();
          }}
        >
          <HiOutlineRefresh className="size-4" />
          Sincronizar servicios
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => {
            void (async () => {
              const confirmed = await confirmDialog.danger({
                title: "Eliminar provider",
                description: `¿Eliminar el provider “${provider.name}”? Se borrarán también sus servicios cacheados.`,
                confirmLabel: "Eliminar",
              });
              if (!confirmed) return;
              const result = await deleteSmmProviderAction({ id: provider.id });
              if (!result.success) {
                toast.error(result.message);
                return;
              }
              toast.success("Provider eliminado");
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

export const providersColumns: ColumnDef<SmmProviderListItemDto>[] = [
  {
    accessorKey: "name",
    header: "Provider",
    cell: ({ row }) => {
      const provider = row.original;
      return (
        <div className="min-w-0 max-w-72">
          <Link
            href={`/admin/providers/${provider.id}`}
            className="block truncate font-medium hover:underline"
          >
            {provider.name}
            {provider.isDefault ? (
              <Badge variant="outline" className="ml-2">
                Default
              </Badge>
            ) : null}
          </Link>
          <p className="truncate text-xs text-muted-foreground">
            {provider.slug}
          </p>
        </div>
      );
    },
  },
  {
    accessorKey: "apiUrl",
    header: "API URL",
    cell: ({ row }) => (
      <span className="block max-w-56 truncate text-sm text-muted-foreground">
        {row.original.apiUrl}
      </span>
    ),
  },
  {
    id: "apiKey",
    header: "API Key",
    cell: ({ row }) => (
      <code className="rounded-md bg-muted px-1.5 py-0.5 text-xs">
        {row.original.apiKeyMasked}
      </code>
    ),
  },
  {
    id: "services",
    header: "Servicios",
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.servicesCount}</span>
    ),
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => (
      <Badge variant={statusVariant(row.original.status)}>
        {statusLabel(row.original.status)}
      </Badge>
    ),
  },
  {
    id: "synced",
    header: "Última sync",
    cell: ({ row }) => formatDateTime(row.original.lastSyncedAt),
  },
  {
    id: "actions",
    cell: ({ row }) => <ProviderActions provider={row.original} />,
  },
];

export function ProvidersTable({ data }: { data: SmmProviderListItemDto[] }) {
  return (
    <DataTable
      columns={providersColumns}
      data={data}
      manual
      hideToolbar
      hidePagination
      emptyMessage="No hay providers para mostrar."
    />
  );
}
