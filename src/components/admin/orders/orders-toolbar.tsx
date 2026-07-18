"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  HiChevronDown,
  HiOutlineFilter,
  HiOutlinePlus,
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
  orderStatusLabel,
  paymentStatusLabel,
  type OrdersListQuery,
  type OrdersSortField,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/validations/orders";

type OrdersToolbarProps = {
  query: OrdersListQuery;
};

type FilterOverrides = Partial<{
  q: string | undefined;
  status: OrdersListQuery["status"] | undefined;
  paymentStatus: OrdersListQuery["paymentStatus"] | undefined;
  sort: OrdersSortField | undefined;
  order: "asc" | "desc" | undefined;
}>;

const sortOptions: Array<{
  sort: OrdersSortField;
  order: "asc" | "desc";
  label: string;
}> = [
  { sort: "createdAt", order: "desc", label: "Más recientes" },
  { sort: "total", order: "desc", label: "Mayor monto" },
  { sort: "email", order: "asc", label: "Email A–Z" },
  { sort: "status", order: "asc", label: "Estado" },
  { sort: "updatedAt", order: "desc", label: "Actualizadas" },
];

const orderStatuses = Object.keys(orderStatusLabel) as OrderStatus[];
const paymentStatuses = Object.keys(paymentStatusLabel) as PaymentStatus[];

function buildHref(
  query: OrdersListQuery,
  overrides: FilterOverrides,
): string {
  const next = {
    q: "q" in overrides ? overrides.q : query.q,
    pageSize: query.pageSize,
    status: "status" in overrides ? overrides.status : query.status,
    paymentStatus:
      "paymentStatus" in overrides
        ? overrides.paymentStatus
        : query.paymentStatus,
    sort: "sort" in overrides ? (overrides.sort ?? "createdAt") : query.sort,
    order: "order" in overrides ? (overrides.order ?? "desc") : query.order,
  };

  const params = new URLSearchParams();
  if (next.q) params.set("q", next.q);
  if (next.pageSize !== 20) params.set("pageSize", String(next.pageSize));
  if (next.status) params.set("status", next.status);
  if (next.paymentStatus) params.set("paymentStatus", next.paymentStatus);
  if (next.sort !== "createdAt") params.set("sort", next.sort);
  if (next.order !== "desc") params.set("order", next.order);

  const qs = params.toString();
  return qs ? `/admin/orders?${qs}` : "/admin/orders";
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

export function OrdersToolbar({ query }: OrdersToolbarProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const activeFilterCount = useMemo(
    () =>
      [
        query.status,
        query.paymentStatus,
        query.sort !== "createdAt" || query.order !== "desc",
      ].filter(Boolean).length,
    [query.order, query.paymentStatus, query.sort, query.status],
  );

  function apply(overrides: FilterOverrides) {
    router.push(buildHref(query, overrides));
  }

  function clearFilters() {
    router.push(
      buildHref(query, {
        status: undefined,
        paymentStatus: undefined,
        sort: "createdAt",
        order: "desc",
      }),
    );
    setOpen(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Órdenes
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Gestiona pedidos, genera links de pago Flow y revisa el estado de
            cada compra.
          </p>
        </div>
        <Button
          render={<Link href="/admin/orders/new" />}
          nativeButton={false}
          className="shrink-0"
        >
          <HiOutlinePlus className="size-4" />
          Crear orden
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SsrSearchInput
          value={query.q ?? ""}
          buildHref={(q) => buildHref(query, { q })}
          placeholder="Buscar por email, nombre o ID..."
          aria-label="Buscar órdenes"
          className="w-full max-w-sm sm:w-72"
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
            className="w-[min(100vw-2rem,32rem)] max-w-none gap-0 p-0"
          >
            <PopoverHeader className="flex-row items-start justify-between gap-3 border-b border-border px-4 py-3">
              <div className="space-y-1">
                <PopoverTitle className="flex items-center gap-2 text-sm">
                  <HiOutlineFilter className="size-4 text-primary" />
                  Filtrar órdenes
                </PopoverTitle>
                <PopoverDescription className="text-xs">
                  Estado, pago y ordenamiento.
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
            <div className="grid gap-0 sm:grid-cols-3">
              <section className="border-b border-border p-3 sm:border-r sm:border-b-0">
                <div className="mb-2 px-1 text-xs font-medium text-muted-foreground">
                  Estado
                </div>
                <div className="max-h-56 space-y-0.5 overflow-y-auto">
                  <FilterOptionButton
                    active={!query.status}
                    label="Todas"
                    onClick={() => apply({ status: undefined })}
                  />
                  {orderStatuses.map((status) => (
                    <FilterOptionButton
                      key={status}
                      active={query.status === status}
                      label={orderStatusLabel[status]}
                      onClick={() => apply({ status })}
                    />
                  ))}
                </div>
              </section>
              <section className="border-b border-border p-3 sm:border-r sm:border-b-0">
                <div className="mb-2 px-1 text-xs font-medium text-muted-foreground">
                  Pago
                </div>
                <div className="max-h-56 space-y-0.5 overflow-y-auto">
                  <FilterOptionButton
                    active={!query.paymentStatus}
                    label="Todos"
                    onClick={() => apply({ paymentStatus: undefined })}
                  />
                  {paymentStatuses.map((status) => (
                    <FilterOptionButton
                      key={status}
                      active={query.paymentStatus === status}
                      label={paymentStatusLabel[status]}
                      onClick={() => apply({ paymentStatus: status })}
                    />
                  ))}
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
            {orderStatusLabel[query.status]}
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
        {query.paymentStatus ? (
          <Badge variant="secondary" className="gap-1">
            Pago: {paymentStatusLabel[query.paymentStatus]}
            <button
              type="button"
              aria-label="Quitar filtro de pago"
              className="rounded-full p-0.5 hover:bg-foreground/10"
              onClick={() => apply({ paymentStatus: undefined })}
            >
              <HiOutlineX className="size-3" />
            </button>
          </Badge>
        ) : null}
      </div>
    </div>
  );
}
