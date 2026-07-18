"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  HiChevronDown,
  HiOutlineCheckCircle,
  HiOutlineCollection,
  HiOutlineExclamationCircle,
  HiOutlineFilter,
  HiOutlinePlus,
  HiOutlineRefresh,
  HiOutlineX,
} from "react-icons/hi";

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
import type { ProvidersListQuery } from "@/lib/validations/smm-providers";

type ProvidersToolbarProps = {
  query: ProvidersListQuery;
};

type FilterOverrides = Partial<{
  status: ProvidersListQuery["status"] | undefined;
  sort: ProvidersListQuery["sort"] | undefined;
  order: "asc" | "desc" | undefined;
}>;

const statusOptions = [
  { value: "all" as const, label: "Todos", icon: HiOutlineCollection },
  { value: "ACTIVE" as const, label: "Activo", icon: HiOutlineCheckCircle },
  {
    value: "INACTIVE" as const,
    label: "Inactivo",
    icon: HiOutlineCollection,
  },
  {
    value: "ERROR" as const,
    label: "Error",
    icon: HiOutlineExclamationCircle,
  },
];

function buildHref(query: ProvidersListQuery, overrides: FilterOverrides) {
  const next = {
    q: query.q,
    pageSize: query.pageSize,
    status: "status" in overrides ? overrides.status : query.status,
    sort: "sort" in overrides ? (overrides.sort ?? "updatedAt") : query.sort,
    order: "order" in overrides ? (overrides.order ?? "desc") : query.order,
  };

  const params = new URLSearchParams();
  if (next.q) params.set("q", next.q);
  if (next.pageSize !== 20) params.set("pageSize", String(next.pageSize));
  if (next.status) params.set("status", next.status);
  if (next.sort !== "updatedAt") params.set("sort", next.sort);
  if (next.order !== "desc") params.set("order", next.order);

  const qs = params.toString();
  return qs ? `/admin/providers?${qs}` : "/admin/providers";
}

function FilterOptionButton({
  active,
  label,
  icon: Icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
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
      <Icon className="size-4 shrink-0 opacity-80" />
      <span className="truncate">{label}</span>
    </button>
  );
}

export function ProvidersToolbar({ query }: ProvidersToolbarProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const activeFilterCount = useMemo(
    () =>
      [
        query.status,
        query.sort !== "updatedAt" || query.order !== "desc",
      ].filter(Boolean).length,
    [query.order, query.sort, query.status],
  );

  function apply(overrides: FilterOverrides) {
    router.push(buildHref(query, overrides));
  }

  function clearFilters() {
    router.push(
      buildHref(query, {
        status: undefined,
        sort: "updatedAt",
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
            Providers SMM
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Administra paneles SMM, credenciales API y el catálogo de servicios
            sincronizados.
          </p>
        </div>
        <Button
          render={<Link href="/admin/providers/new" />}
          nativeButton={false}
          className="shrink-0"
        >
          <HiOutlinePlus className="size-4" />
          Añadir provider
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
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
            className="w-[min(100vw-2rem,28rem)] max-w-none gap-0 p-0"
          >
            <PopoverHeader className="flex-row items-start justify-between gap-3 border-b border-border px-4 py-3">
              <div className="space-y-1">
                <PopoverTitle className="flex items-center gap-2 text-sm">
                  <HiOutlineFilter className="size-4 text-primary" />
                  Filtrar providers
                </PopoverTitle>
                <PopoverDescription className="text-xs">
                  Estado y ordenamiento.
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
            <div className="grid gap-0 sm:grid-cols-2">
              <section className="border-b border-border p-3 sm:border-r sm:border-b-0">
                <div className="mb-2 px-1 text-xs font-medium text-muted-foreground">
                  Estado
                </div>
                <div className="space-y-0.5">
                  {statusOptions.map((option) => (
                    <FilterOptionButton
                      key={option.value}
                      active={
                        option.value === "all"
                          ? !query.status
                          : query.status === option.value
                      }
                      label={option.label}
                      icon={option.icon}
                      onClick={() =>
                        apply({
                          status:
                            option.value === "all" ? undefined : option.value,
                        })
                      }
                    />
                  ))}
                </div>
              </section>
              <section className="p-3">
                <div className="mb-2 px-1 text-xs font-medium text-muted-foreground">
                  Ordenar
                </div>
                <div className="space-y-0.5">
                  <FilterOptionButton
                    active={
                      query.sort === "updatedAt" && query.order === "desc"
                    }
                    label="Más recientes"
                    icon={HiOutlineRefresh}
                    onClick={() => apply({ sort: "updatedAt", order: "desc" })}
                  />
                  <FilterOptionButton
                    active={query.sort === "name" && query.order === "asc"}
                    label="Nombre A–Z"
                    icon={HiOutlineCollection}
                    onClick={() => apply({ sort: "name", order: "asc" })}
                  />
                  <FilterOptionButton
                    active={
                      query.sort === "lastSyncedAt" && query.order === "desc"
                    }
                    label="Última sync"
                    icon={HiOutlineRefresh}
                    onClick={() =>
                      apply({ sort: "lastSyncedAt", order: "desc" })
                    }
                  />
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
            {statusOptions.find((item) => item.value === query.status)?.label}
            <button
              type="button"
              aria-label="Quitar estado"
              className="rounded-full p-0.5 hover:bg-foreground/10"
              onClick={() => apply({ status: undefined })}
            >
              <HiOutlineX className="size-3" />
            </button>
          </Badge>
        ) : null}
      </div>
    </div>
  );
}
