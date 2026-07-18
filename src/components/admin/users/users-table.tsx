"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { HiOutlineDotsHorizontal, HiOutlineEye } from "react-icons/hi";

import {
  UserRoleBadge,
  UserStatusBadge,
} from "@/components/admin/users/user-status-badge";
import { DataTable } from "@/components/data-table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDateTime } from "@/lib/format-date";
import { formatMoney } from "@/lib/products/format";
import type { UserListItemDto } from "@/types/users";

const columns: ColumnDef<UserListItemDto>[] = [
  {
    id: "user",
    header: "Usuario",
    cell: ({ row }) => {
      const user = row.original;
      const initials = user.name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
      return (
        <div className="flex max-w-56 items-center gap-3">
          <Avatar size="sm">
            {user.image ? (
              <AvatarImage src={user.image} alt={user.name} />
            ) : null}
            <AvatarFallback>{initials || "U"}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <Link
              href={`/admin/users/${user.id}`}
              className="block truncate font-medium hover:underline"
            >
              {user.name}
            </Link>
            <p className="truncate font-mono text-xs text-muted-foreground">
              {user.id.slice(0, 10)}…
            </p>
          </div>
        </div>
      );
    },
  },
  {
    id: "email",
    header: "Email",
    cell: ({ row }) => (
      <div className="max-w-48 truncate text-sm">{row.original.email}</div>
    ),
  },
  {
    id: "role",
    header: "Rol",
    cell: ({ row }) => <UserRoleBadge role={row.original.role} />,
  },
  {
    id: "status",
    header: "Estado",
    cell: ({ row }) => (
      <UserStatusBadge
        status={row.original.derivedStatus}
        accountStatus={row.original.accountStatus}
      />
    ),
  },
  {
    id: "verification",
    header: "Verificación",
    cell: ({ row }) =>
      row.original.emailVerified ? (
        <Badge variant="secondary">Verificado</Badge>
      ) : (
        <Badge variant="outline">Pendiente</Badge>
      ),
  },
  {
    id: "orders",
    header: "Pedidos",
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.orderCount}</span>
    ),
  },
  {
    id: "spent",
    header: "Total gastado",
    cell: ({ row }) => (
      <span className="font-medium tabular-nums">
        {formatMoney(row.original.totalSpent, row.original.currency)}
      </span>
    ),
  },
  {
    id: "activity",
    header: "Última actividad",
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {formatDateTime(row.original.lastActivityAt)}
      </span>
    ),
  },
  {
    id: "created",
    header: "Registro",
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {formatDateTime(row.original.createdAt)}
      </span>
    ),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label="Acciones" />
          }
        >
          <HiOutlineDotsHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            render={<Link href={`/admin/users/${row.original.id}`} />}
          >
            <HiOutlineEye className="size-4" />
            Abrir detalle
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];

export function UsersTable({ data }: { data: UserListItemDto[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      manual
      hideToolbar
      hidePagination
      emptyMessage="No hay usuarios para mostrar."
    />
  );
}
