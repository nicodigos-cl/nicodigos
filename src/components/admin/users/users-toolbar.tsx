"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  HiChevronDown,
  HiOutlineDownload,
  HiOutlineFilter,
  HiOutlineRefresh,
} from "react-icons/hi";
import { toast } from "sonner";

import { SsrSearchInput } from "@/components/admin/ssr-search-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { exportUsersAction } from "@/lib/actions/users";
import { usersHref } from "@/lib/users/url";
import {
  userAccountStatusLabel,
  userRoleLabel,
  type UsersListQuery,
} from "@/lib/validations/users";

const inputClass =
  "h-9 w-full rounded-xl border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30";

const segmentOptions = [
  ["withOrders", "Con pedidos"],
  ["withoutOrders", "Sin pedidos"],
  ["withApprovedPurchases", "Con compras aprobadas"],
  ["withFailedPayments", "Con pagos fallidos"],
  ["withPendingDeliveries", "Con entregas pendientes"],
  ["withCompleteBilling", "Facturación completa"],
  ["withRut", "Con RUT"],
  ["requiresReview", "Requiere revisión"],
  ["adminsOnly", "Administradores"],
  ["blockedOnly", "Bloqueados / restringidos"],
] as const;

function countActiveFilters(query: UsersListQuery) {
  let count = 0;
  if (query.role) count += 1;
  if (query.accountStatus) count += 1;
  if (query.emailVerified != null) count += 1;
  if (query.registeredFrom) count += 1;
  if (query.registeredTo) count += 1;
  if (query.activeFrom) count += 1;
  if (query.activeTo) count += 1;
  if (query.minSpent != null) count += 1;
  if (query.maxSpent != null) count += 1;
  if (query.sort !== "createdAt" || query.order !== "desc") count += 1;
  if (query.pageSize !== 20) count += 1;
  for (const [key] of segmentOptions) {
    if (query[key]) count += 1;
  }
  return count;
}

export function UsersToolbar({ query }: { query: UsersListQuery }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [exporting, startExport] = useTransition();
  const activeFilterCount = useMemo(() => countActiveFilters(query), [query]);

  function exportCsv() {
    startExport(() => {
      void (async () => {
        const { page: _page, pageSize: _pageSize, ...filters } = query;
        void _page;
        void _pageSize;
        const result = await exportUsersAction({
          ...filters,
          confirmation: "EXPORTAR",
        });
        if (!result.success) return toast.error(result.message);
        const url = URL.createObjectURL(
          new Blob([result.data.content], { type: "text/csv;charset=utf-8" }),
        );
        const link = document.createElement("a");
        link.href = url;
        link.download = result.data.filename;
        link.click();
        URL.revokeObjectURL(url);
        toast.success("Exportación preparada");
      })();
    });
  }

  function clearFilters() {
    setOpen(false);
    router.push(query.q ? `/admin/users?q=${encodeURIComponent(query.q)}` : "/admin/users");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Usuarios
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Consulta perfiles, actividad, pedidos y estado de acceso de los
            usuarios de Nicodigos.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={exporting}
          onClick={exportCsv}
        >
          <HiOutlineDownload className="size-4" />
          {exporting ? "Exportando…" : "Exportar CSV"}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SsrSearchInput
          value={query.q ?? ""}
          buildHref={(q) => usersHref(query, { q, page: 1 })}
          placeholder="ID, nombre, email, RUT, pedido o transacción…"
          aria-label="Buscar usuarios"
          className="w-full max-w-sm sm:w-80"
        />

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            render={<Button type="button" variant="outline" size="sm" />}
          >
            <HiOutlineFilter className="size-4" />
            Filtros y ordenamiento
            {activeFilterCount > 0 ? (
              <Badge className="h-5 min-w-5 justify-center rounded-full px-1.5">
                {activeFilterCount}
              </Badge>
            ) : null}
            <HiChevronDown className="size-3.5 opacity-70" />
          </PopoverTrigger>

          <PopoverContent
            align="start"
            sideOffset={8}
            className="w-[min(100vw-2rem,48rem)] max-w-none gap-0 p-0"
          >
            <PopoverHeader className="flex-row items-start justify-between gap-3 border-b border-border px-4 py-3">
              <div className="space-y-1">
                <PopoverTitle className="flex items-center gap-2 text-sm">
                  <HiOutlineFilter className="size-4 text-primary" />
                  Filtros y ordenamiento
                </PopoverTitle>
                <PopoverDescription className="text-xs">
                  Rol, estado, actividad, gasto y segmentos.
                </PopoverDescription>
              </div>
              {activeFilterCount > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={clearFilters}
                >
                  <HiOutlineRefresh className="size-3.5" />
                  Limpiar
                </Button>
              ) : null}
            </PopoverHeader>

            <form method="get" className="space-y-0">
              {query.q ? <input type="hidden" name="q" value={query.q} /> : null}

              <div className="grid gap-0 sm:grid-cols-2 lg:grid-cols-4">
                <section className="space-y-3 border-b border-border p-4 sm:border-r lg:border-b-0">
                  <div className="text-xs font-medium text-muted-foreground">
                    Cuenta
                  </div>
                  <label className="grid gap-1 text-xs text-muted-foreground">
                    Rol
                    <select
                      name="role"
                      defaultValue={query.role ?? ""}
                      className={inputClass}
                    >
                      <option value="">Todos</option>
                      {Object.entries(userRoleLabel).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1 text-xs text-muted-foreground">
                    Estado
                    <select
                      name="accountStatus"
                      defaultValue={query.accountStatus ?? ""}
                      className={inputClass}
                    >
                      <option value="">Todos</option>
                      {Object.entries(userAccountStatusLabel).map(
                        ([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                  <label className="grid gap-1 text-xs text-muted-foreground">
                    Email
                    <select
                      name="emailVerified"
                      defaultValue={
                        query.emailVerified == null
                          ? ""
                          : String(query.emailVerified)
                      }
                      className={inputClass}
                    >
                      <option value="">Todos</option>
                      <option value="true">Verificado</option>
                      <option value="false">Sin verificar</option>
                    </select>
                  </label>
                </section>

                <section className="space-y-3 border-b border-border p-4 sm:border-r-0 lg:border-r lg:border-b-0">
                  <div className="text-xs font-medium text-muted-foreground">
                    Fechas
                  </div>
                  <label className="grid gap-1 text-xs text-muted-foreground">
                    Registro desde
                    <input
                      type="date"
                      name="registeredFrom"
                      defaultValue={query.registeredFrom?.slice(0, 10)}
                      className={inputClass}
                    />
                  </label>
                  <label className="grid gap-1 text-xs text-muted-foreground">
                    Registro hasta
                    <input
                      type="date"
                      name="registeredTo"
                      defaultValue={query.registeredTo?.slice(0, 10)}
                      className={inputClass}
                    />
                  </label>
                  <label className="grid gap-1 text-xs text-muted-foreground">
                    Actividad desde
                    <input
                      type="date"
                      name="activeFrom"
                      defaultValue={query.activeFrom?.slice(0, 10)}
                      className={inputClass}
                    />
                  </label>
                  <label className="grid gap-1 text-xs text-muted-foreground">
                    Actividad hasta
                    <input
                      type="date"
                      name="activeTo"
                      defaultValue={query.activeTo?.slice(0, 10)}
                      className={inputClass}
                    />
                  </label>
                </section>

                <section className="space-y-3 border-b border-border p-4 sm:border-r lg:border-b-0">
                  <div className="text-xs font-medium text-muted-foreground">
                    Gasto y orden
                  </div>
                  <label className="grid gap-1 text-xs text-muted-foreground">
                    Gasto mínimo
                    <input
                      type="number"
                      min="0"
                      name="minSpent"
                      defaultValue={query.minSpent}
                      className={inputClass}
                    />
                  </label>
                  <label className="grid gap-1 text-xs text-muted-foreground">
                    Gasto máximo
                    <input
                      type="number"
                      min="0"
                      name="maxSpent"
                      defaultValue={query.maxSpent}
                      className={inputClass}
                    />
                  </label>
                  <label className="grid gap-1 text-xs text-muted-foreground">
                    Ordenar por
                    <select
                      name="sort"
                      defaultValue={query.sort}
                      className={inputClass}
                    >
                      <option value="createdAt">Registro</option>
                      <option value="lastActivityAt">Última actividad</option>
                      <option value="name">Nombre</option>
                      <option value="orderCount">Pedidos</option>
                      <option value="totalSpent">Total gastado</option>
                      <option value="transactionCount">Transacciones</option>
                      <option value="deliveryCount">Entregas</option>
                    </select>
                  </label>
                  <label className="grid gap-1 text-xs text-muted-foreground">
                    Dirección
                    <select
                      name="order"
                      defaultValue={query.order}
                      className={inputClass}
                    >
                      <option value="desc">Descendente</option>
                      <option value="asc">Ascendente</option>
                    </select>
                  </label>
                  <label className="grid gap-1 text-xs text-muted-foreground">
                    Resultados
                    <select
                      name="pageSize"
                      defaultValue={query.pageSize}
                      className={inputClass}
                    >
                      <option value="10">10</option>
                      <option value="20">20</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                    </select>
                  </label>
                </section>

                <section className="space-y-3 p-4">
                  <div className="text-xs font-medium text-muted-foreground">
                    Segmentos
                  </div>
                  <div className="max-h-64 space-y-2 overflow-y-auto text-sm">
                    {segmentOptions.map(([name, label]) => (
                      <label key={name} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name={name}
                          value="true"
                          defaultChecked={Boolean(query[name])}
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </section>
              </div>

              <Separator />
              <div className="flex items-center justify-between gap-2 px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  {activeFilterCount === 0
                    ? "Sin filtros activos"
                    : `${activeFilterCount} filtro${activeFilterCount === 1 ? "" : "s"} activo${activeFilterCount === 1 ? "" : "s"}`}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setOpen(false)}
                  >
                    Cerrar
                  </Button>
                  <Button type="submit" size="sm">
                    Aplicar filtros
                  </Button>
                </div>
              </div>
            </form>
          </PopoverContent>
        </Popover>

        <Button
          variant="outline"
          size="sm"
          render={<Link href="/admin/users" />}
          nativeButton={false}
        >
          <HiOutlineRefresh className="size-4" />
          Limpiar
        </Button>
      </div>
    </div>
  );
}
