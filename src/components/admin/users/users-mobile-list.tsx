import Link from "next/link";

import {
  UserRoleBadge,
  UserStatusBadge,
} from "@/components/admin/users/user-status-badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format-date";
import { formatMoney } from "@/lib/products/format";
import type { UserListItemDto } from "@/types/users";

export function UsersMobileList({ data }: { data: UserListItemDto[] }) {
  return (
    <ul className="space-y-3">
      {data.map((row) => (
        <li
          key={row.id}
          className="rounded-2xl border border-border bg-card p-4"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-heading text-lg font-semibold">
                {row.name}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {row.email}
              </p>
            </div>
            <UserStatusBadge
              status={row.derivedStatus}
              accountStatus={row.accountStatus}
            />
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Rol</dt>
              <dd>
                <UserRoleBadge role={row.role} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Pedidos</dt>
              <dd className="tabular-nums">{row.orderCount}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Total gastado</dt>
              <dd className="tabular-nums">
                {formatMoney(row.totalSpent, row.currency)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Última actividad</dt>
              <dd>{formatDateTime(row.lastActivityAt)}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs text-muted-foreground">Registro</dt>
              <dd>{formatDateTime(row.createdAt)}</dd>
            </div>
          </dl>
          <Button
            className="mt-3 w-full"
            size="sm"
            variant="outline"
            render={<Link href={`/admin/users/${row.id}`} />}
            nativeButton={false}
          >
            Abrir detalle
          </Button>
        </li>
      ))}
    </ul>
  );
}
