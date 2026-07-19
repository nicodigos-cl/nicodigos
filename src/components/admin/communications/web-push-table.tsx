"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";

import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import type { WebPushStatus } from "@/generated/prisma/enums";
import { webPushStatusLabels } from "@/lib/communications/status";

type WebPushListItem = {
  id: string;
  name: string;
  title: string;
  body: string;
  status: WebPushStatus;
  audienceType: string;
  estimatedRecipients: number | null;
  successful: number;
  delivered: number;
  clicked: number;
  failed: number;
  createdByEmail: string;
  scheduledAt: string | null;
  sentAt: string | null;
};

const dateFormatter = new Intl.DateTimeFormat("es-CL", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Santiago",
});

const columns: ColumnDef<WebPushListItem>[] = [
  {
    accessorKey: "title",
    header: "Título",
    cell: ({ row }) => (
      <div>
        <Link
          className="font-medium hover:text-primary"
          href={`/admin/communications/web-push/${row.original.id}`}
        >
          {row.original.title}
        </Link>
        <p className="line-clamp-1 text-xs text-muted-foreground">
          {row.original.name}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => (
      <Badge variant="secondary">
        {webPushStatusLabels[row.original.status]}
      </Badge>
    ),
  },
  {
    accessorKey: "audienceType",
    header: "Audiencia",
    cell: ({ row }) => (
      <span className="text-xs">
        {row.original.audienceType.replaceAll("_", " ")} ·{" "}
        {row.original.estimatedRecipients ?? "por resolver"}
      </span>
    ),
  },
  ...(["successful", "delivered", "clicked"] as const).map(
    (key): ColumnDef<WebPushListItem> => ({
      accessorKey: key,
      header: {
        successful: "Enviadas",
        delivered: "Entregadas",
        clicked: "Clics",
      }[key],
      cell: ({ row }) => (
        <span className="block text-right tabular-nums">
          {row.original[key]}
        </span>
      ),
    }),
  ),
  {
    accessorKey: "createdByEmail",
    header: "Creada por",
    cell: ({ row }) => (
      <span className="text-xs">{row.original.createdByEmail}</span>
    ),
  },
  {
    id: "deliveryDate",
    header: "Programada / enviada",
    cell: ({ row }) => {
      const date = row.original.scheduledAt ?? row.original.sentAt;
      return (
        <span className="text-xs">
          {date ? dateFormatter.format(new Date(date)) : "—"}
        </span>
      );
    },
  },
];

export function WebPushTable({ items }: { items: WebPushListItem[] }) {
  return (
    <>
      <DataTable
        columns={columns}
        data={items}
        manual
        hideToolbar
        hidePagination
        className="hidden md:flex"
        getRowId={(item) => item.id}
      />
      <div className="grid gap-3 md:hidden">
        {items.map((item) => (
          <Link
            href={`/admin/communications/web-push/${item.id}`}
            key={item.id}
            className="rounded-2xl border border-border bg-card p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium">{item.title}</p>
              <Badge variant="secondary">
                {webPushStatusLabels[item.status]}
              </Badge>
            </div>
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
              {item.body}
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <span>Entregadas {item.delivered}</span>
              <span>Clics {item.clicked}</span>
              <span>Fallidas {item.failed}</span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
