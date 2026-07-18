"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  HiChevronDown,
  HiOutlineFilter,
  HiOutlineRefresh,
} from "react-icons/hi";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  CUSTOMER_TRANSACTIONS_PATH,
  customerTransactionsPath,
} from "@/lib/customer-dashboard/paths";
import {
  customerTransactionSortValues,
  customerTransactionStatusFilterValues,
  type CustomerTransactionsListQuery,
} from "@/lib/customer-dashboard/validations";

const inputClass =
  "h-9 w-full rounded-xl border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30";

const statusLabels: Record<
  (typeof customerTransactionStatusFilterValues)[number],
  string
> = {
  all: "Todas",
  pending: "Pendientes",
  paid: "Pagadas",
  failed: "Fallidas",
  refunded: "Reembolsadas",
};

const sortLabels: Record<
  (typeof customerTransactionSortValues)[number],
  string
> = {
  newest: "Más recientes",
  oldest: "Más antiguas",
  amount_desc: "Mayor monto",
  amount_asc: "Menor monto",
};

function countActiveFilters(query: CustomerTransactionsListQuery): number {
  let count = 0;
  if (query.status !== "all") count += 1;
  if (query.from) count += 1;
  if (query.to) count += 1;
  if (query.sort !== "newest") count += 1;
  return count;
}

export function TransactionsFilters({
  query,
}: {
  query: CustomerTransactionsListQuery;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const activeFilterCount = useMemo(() => countActiveFilters(query), [query]);

  function clearFilters() {
    setOpen(false);
    router.push(
      query.q
        ? customerTransactionsPath({ q: query.q })
        : CUSTOMER_TRANSACTIONS_PATH,
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <form
        action={CUSTOMER_TRANSACTIONS_PATH}
        method="get"
        className="flex min-w-0 flex-1 gap-2"
      >
        {query.status !== "all" ? (
          <input type="hidden" name="status" value={query.status} />
        ) : null}
        {query.sort !== "newest" ? (
          <input type="hidden" name="sort" value={query.sort} />
        ) : null}
        {query.from ? <input type="hidden" name="from" value={query.from} /> : null}
        {query.to ? <input type="hidden" name="to" value={query.to} /> : null}

        <Input
          name="q"
          defaultValue={query.q ?? ""}
          placeholder="Buscar por pedido"
          aria-label="Buscar transacciones"
          className="min-w-0 flex-1"
        />
        <Button type="submit" variant="outline" className="shrink-0">
          Buscar
        </Button>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            render={<Button type="button" variant="outline" />}
          >
            <HiOutlineFilter className="size-4" />
            Filtros
            {activeFilterCount > 0 ? (
              <Badge className="h-5 min-w-5 justify-center rounded-full px-1.5">
                {activeFilterCount}
              </Badge>
            ) : null}
            <HiChevronDown className="size-3.5 opacity-70" />
          </PopoverTrigger>

          <PopoverContent
            align="end"
            sideOffset={8}
            className="w-[min(100vw-2rem,40rem)] max-w-none gap-0 p-0"
          >
            <PopoverHeader className="flex-row items-start justify-between gap-3 border-b border-border px-4 py-3">
              <div className="space-y-1">
                <PopoverTitle className="flex items-center gap-2 text-sm">
                  <HiOutlineFilter className="size-4 text-primary" />
                  Filtrar transacciones
                </PopoverTitle>
                <PopoverDescription className="text-xs">
                  Estado, fechas y orden.
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

            <form
              action={CUSTOMER_TRANSACTIONS_PATH}
              method="get"
              className="space-y-0"
              onSubmit={() => setOpen(false)}
            >
              {query.q ? <input type="hidden" name="q" value={query.q} /> : null}

              <div className="grid gap-0 sm:grid-cols-2 lg:grid-cols-3">
                <section className="space-y-3 border-b border-border p-4 sm:border-r lg:border-b-0">
                  <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Estado
                  </div>
                  <label className="grid gap-1.5 text-xs text-muted-foreground">
                    Pago
                    <select
                      name="status"
                      defaultValue={query.status}
                      className={inputClass}
                      aria-label="Filtrar por estado"
                    >
                      {customerTransactionStatusFilterValues.map((status) => (
                        <option key={status} value={status}>
                          {statusLabels[status]}
                        </option>
                      ))}
                    </select>
                  </label>
                </section>

                <section className="space-y-3 border-b border-border p-4 sm:border-r-0 lg:border-r lg:border-b-0">
                  <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Fechas
                  </div>
                  <label className="grid gap-1.5 text-xs text-muted-foreground">
                    Desde
                    <input
                      type="date"
                      name="from"
                      defaultValue={query.from ?? ""}
                      className={inputClass}
                      aria-label="Desde"
                    />
                  </label>
                  <label className="grid gap-1.5 text-xs text-muted-foreground">
                    Hasta
                    <input
                      type="date"
                      name="to"
                      defaultValue={query.to ?? ""}
                      className={inputClass}
                      aria-label="Hasta"
                    />
                  </label>
                </section>

                <section className="space-y-3 p-4 sm:col-span-2 lg:col-span-1">
                  <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Orden
                  </div>
                  <label className="grid gap-1.5 text-xs text-muted-foreground">
                    Ordenar por
                    <select
                      name="sort"
                      defaultValue={query.sort}
                      className={inputClass}
                      aria-label="Ordenar transacciones"
                    >
                      {customerTransactionSortValues.map((sort) => (
                        <option key={sort} value={sort}>
                          {sortLabels[sort]}
                        </option>
                      ))}
                    </select>
                  </label>
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
                    Aplicar
                  </Button>
                </div>
              </div>
            </form>
          </PopoverContent>
        </Popover>

        {activeFilterCount > 0 || query.q ? (
          <Button
            variant="outline"
            size="sm"
            render={<Link href={CUSTOMER_TRANSACTIONS_PATH} />}
            nativeButton={false}
          >
            <HiOutlineRefresh className="size-4" />
            Limpiar
          </Button>
        ) : null}
      </div>
    </div>
  );
}
