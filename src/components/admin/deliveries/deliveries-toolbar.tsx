"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  HiChevronDown,
  HiOutlineFilter,
  HiOutlineRefresh,
  HiOutlineX,
} from "react-icons/hi";

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
import { cn } from "@/lib/utils";
import {
  deliveryMethodLabel,
  deliveryStatusLabel,
  type DeliveriesListQuery,
  type DeliveriesSortField,
  type DeliveryMethod,
  type DeliveryStatus,
} from "@/lib/validations/deliveries";

type DeliveriesToolbarProps = {
  query: DeliveriesListQuery;
};

type FilterOverrides = Partial<{
  q: string | undefined;
  status: DeliveriesListQuery["status"] | undefined;
  method: DeliveriesListQuery["method"] | undefined;
  hasError: boolean | undefined;
  needsManual: boolean | undefined;
  hasExternal: boolean | undefined;
  sort: DeliveriesSortField | undefined;
  order: "asc" | "desc" | undefined;
}>;

const sortOptions: Array<{
  sort: DeliveriesSortField;
  order: "asc" | "desc";
  label: string;
}> = [
  { sort: "createdAt", order: "desc", label: "Más recientes" },
  { sort: "updatedAt", order: "desc", label: "Actualizadas" },
  { sort: "createdAt", order: "asc", label: "Más antiguas" },
];

const statuses = Object.keys(deliveryStatusLabel) as DeliveryStatus[];
const methods = Object.keys(deliveryMethodLabel) as DeliveryMethod[];

export function buildDeliveriesHref(
  query: DeliveriesListQuery,
  overrides: FilterOverrides & { page?: number } = {},
): string {
  const next = {
    q: "q" in overrides ? overrides.q : query.q,
    pageSize: query.pageSize,
    status: "status" in overrides ? overrides.status : query.status,
    method: "method" in overrides ? overrides.method : query.method,
    hasError: "hasError" in overrides ? overrides.hasError : query.hasError,
    needsManual:
      "needsManual" in overrides ? overrides.needsManual : query.needsManual,
    hasExternal:
      "hasExternal" in overrides ? overrides.hasExternal : query.hasExternal,
    sort: "sort" in overrides ? (overrides.sort ?? "createdAt") : query.sort,
    order: "order" in overrides ? (overrides.order ?? "desc") : query.order,
    page: "page" in overrides ? overrides.page : undefined,
  };

  const params = new URLSearchParams();
  if (next.page && next.page > 1) params.set("page", String(next.page));
  if (next.q) params.set("q", next.q);
  if (next.pageSize !== 20) params.set("pageSize", String(next.pageSize));
  if (next.status) params.set("status", next.status);
  if (next.method) params.set("method", next.method);
  if (next.hasError) params.set("hasError", "true");
  if (next.needsManual) params.set("needsManual", "true");
  if (next.hasExternal) params.set("hasExternal", "true");
  if (next.sort !== "createdAt") params.set("sort", next.sort);
  if (next.order !== "desc") params.set("order", next.order);

  const qs = params.toString();
  return qs ? `/admin/deliveries?${qs}` : "/admin/deliveries";
}

function FilterOptionButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-2xl px-2.5 py-2 text-left text-sm transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-foreground hover:bg-muted",
      )}
    >
      <span className="truncate">{label}</span>
    </button>
  );
}

export function DeliveriesToolbar({ query }: DeliveriesToolbarProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const activeFilterCount = useMemo(
    () =>
      [
        query.status,
        query.method,
        query.hasError,
        query.needsManual,
        query.hasExternal,
        query.sort !== "createdAt" || query.order !== "desc",
      ].filter(Boolean).length,
    [query],
  );

  function apply(overrides: FilterOverrides) {
    router.push(buildDeliveriesHref(query, overrides));
  }

  function clearFilters() {
    router.push(
      buildDeliveriesHref(query, {
        status: undefined,
        method: undefined,
        hasError: undefined,
        needsManual: undefined,
        hasExternal: undefined,
        sort: "createdAt",
        order: "desc",
      }),
    );
    setOpen(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Entregas
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Consulta, procesa y audita entregas MANUAL, SMM y Kinguin de productos
          digitales.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SsrSearchInput
          value={query.q ?? ""}
          buildHref={(q) => buildDeliveriesHref(query, { q })}
          placeholder="Buscar por ID, pedido, cliente, producto..."
          aria-label="Buscar entregas"
          className="w-full max-w-sm sm:w-80"
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            render={<Button type="button" variant="outline" size="sm" />}
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
            align="start"
            sideOffset={8}
            className="w-[min(100vw-2rem,40rem)] max-w-none gap-0 p-0"
          >
            <PopoverHeader className="flex-row items-start justify-between gap-3 border-b border-border px-4 py-3">
              <div className="space-y-1">
                <PopoverTitle className="flex items-center gap-2 text-sm">
                  <HiOutlineFilter className="size-4 text-primary" />
                  Filtrar entregas
                </PopoverTitle>
                <PopoverDescription className="text-xs">
                  Estado, método, flags y ordenamiento.
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
            <div className="grid gap-0 sm:grid-cols-4">
              <section className="border-b border-border p-3 sm:border-r sm:border-b-0">
                <div className="mb-2 px-1 text-xs font-medium text-muted-foreground">
                  Estado
                </div>
                <div className="max-h-56 space-y-0.5 overflow-y-auto">
                  <FilterOptionButton
                    active={!query.status}
                    label="Todos"
                    onClick={() => apply({ status: undefined })}
                  />
                  {statuses.map((status) => (
                    <FilterOptionButton
                      key={status}
                      active={query.status === status}
                      label={deliveryStatusLabel[status]}
                      onClick={() => apply({ status })}
                    />
                  ))}
                </div>
              </section>
              <section className="border-b border-border p-3 sm:border-r sm:border-b-0">
                <div className="mb-2 px-1 text-xs font-medium text-muted-foreground">
                  Método
                </div>
                <div className="space-y-0.5">
                  <FilterOptionButton
                    active={!query.method}
                    label="Todos"
                    onClick={() => apply({ method: undefined })}
                  />
                  {methods.map((method) => (
                    <FilterOptionButton
                      key={method}
                      active={query.method === method}
                      label={deliveryMethodLabel[method]}
                      onClick={() => apply({ method })}
                    />
                  ))}
                </div>
              </section>
              <section className="border-b border-border p-3 sm:border-r sm:border-b-0">
                <div className="mb-2 px-1 text-xs font-medium text-muted-foreground">
                  Flags
                </div>
                <div className="space-y-0.5">
                  <FilterOptionButton
                    active={Boolean(query.hasError)}
                    label="Con errores"
                    onClick={() =>
                      apply({ hasError: query.hasError ? undefined : true })
                    }
                  />
                  <FilterOptionButton
                    active={Boolean(query.needsManual)}
                    label="Acción manual"
                    onClick={() =>
                      apply({
                        needsManual: query.needsManual ? undefined : true,
                      })
                    }
                  />
                  <FilterOptionButton
                    active={Boolean(query.hasExternal)}
                    label="Con ref. externa"
                    onClick={() =>
                      apply({
                        hasExternal: query.hasExternal ? undefined : true,
                      })
                    }
                  />
                </div>
              </section>
              <section className="p-3">
                <div className="mb-2 px-1 text-xs font-medium text-muted-foreground">
                  Ordenar
                </div>
                <div className="space-y-0.5">
                  {sortOptions.map((option) => (
                    <FilterOptionButton
                      key={`${option.sort}-${option.order}`}
                      active={
                        query.sort === option.sort &&
                        query.order === option.order
                      }
                      label={option.label}
                      onClick={() =>
                        apply({ sort: option.sort, order: option.order })
                      }
                    />
                  ))}
                </div>
              </section>
            </div>
            <Separator />
            <div className="flex justify-end px-4 py-3">
              <Button type="button" size="sm" onClick={() => setOpen(false)}>
                Listo
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {query.status ? (
          <Badge variant="secondary" className="gap-1">
            {deliveryStatusLabel[query.status]}
            <button
              type="button"
              aria-label="Quitar filtro de estado"
              className="rounded-full p-0.5 hover:bg-foreground/10"
              onClick={() => apply({ status: undefined })}
            >
              <HiOutlineX className="size-3" />
            </button>
          </Badge>
        ) : null}
        {query.method ? (
          <Badge variant="secondary" className="gap-1">
            {deliveryMethodLabel[query.method]}
            <button
              type="button"
              aria-label="Quitar filtro de método"
              className="rounded-full p-0.5 hover:bg-foreground/10"
              onClick={() => apply({ method: undefined })}
            >
              <HiOutlineX className="size-3" />
            </button>
          </Badge>
        ) : null}
      </div>
    </div>
  );
}
