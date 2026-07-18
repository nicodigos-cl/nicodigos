"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { HiOutlineCollection, HiOutlineSearch } from "react-icons/hi";

import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProviderServicesQuery } from "@/lib/validations/smm-providers";
import type {
  SmmServiceDto,
  SmmServicesPageResult,
} from "@/types/smm-provider";

type ProviderServicesManagerProps = {
  providerId: string;
  servicesPage: SmmServicesPageResult;
  query: ProviderServicesQuery;
  categories: string[];
};

function buildHref(
  providerId: string,
  query: ProviderServicesQuery,
  overrides: Partial<ProviderServicesQuery>,
): string {
  const next = { ...query, ...overrides };
  const params = new URLSearchParams();
  if (next.servicesPage > 1) {
    params.set("servicesPage", String(next.servicesPage));
  }
  if (next.servicesPageSize !== 20) {
    params.set("servicesPageSize", String(next.servicesPageSize));
  }
  if (next.servicesQuery) params.set("servicesQuery", next.servicesQuery);
  if (next.servicesCategory) {
    params.set("servicesCategory", next.servicesCategory);
  }
  const qs = params.toString();
  return qs
    ? `/admin/providers/${providerId}?${qs}`
    : `/admin/providers/${providerId}`;
}

export function ProviderServicesManager({
  providerId,
  servicesPage,
  query,
  categories,
}: ProviderServicesManagerProps) {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState(query.servicesQuery ?? "");

  const categoryItems = useMemo(
    () => [
      { value: "all", label: "Todas las categorías" },
      ...categories.map((category) => ({
        value: category,
        label: category,
      })),
    ],
    [categories],
  );

  const columns = useMemo<ColumnDef<SmmServiceDto>[]>(
    () => [
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
          <div className="min-w-0 max-w-64">
            <p className="truncate font-medium">{row.original.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {row.original.type}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "category",
        header: "Categoría",
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
          <div className="flex gap-1">
            {row.original.refill ? (
              <Badge variant="secondary">Refill</Badge>
            ) : null}
            {row.original.cancel ? (
              <Badge variant="outline">Cancel</Badge>
            ) : null}
            {!row.original.refill && !row.original.cancel ? (
              <span className="text-muted-foreground">—</span>
            ) : null}
          </div>
        ),
      },
    ],
    [],
  );

  const from =
    servicesPage.total === 0
      ? 0
      : (servicesPage.page - 1) * servicesPage.pageSize + 1;
  const to = Math.min(
    servicesPage.page * servicesPage.pageSize,
    servicesPage.total,
  );

  return (
    <Card className="shadow-none ring-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HiOutlineCollection className="size-4" />
          Servicios del panel
        </CardTitle>
        <CardDescription>
          Catálogo sincronizado desde la API (`services`). Usa Sincronizar para
          actualizar.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <form
            className="flex min-w-0 flex-1 gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              router.push(
                buildHref(providerId, query, {
                  servicesPage: 1,
                  servicesQuery: searchValue.trim() || undefined,
                }),
              );
            }}
          >
            <div className="min-w-0 flex-1 space-y-2">
              <Label htmlFor="servicesQuery">Buscar</Label>
              <div className="relative">
                <HiOutlineSearch className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="servicesQuery"
                  className="pl-9"
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="Nombre, tipo o categoría..."
                />
              </div>
            </div>
            <Button type="submit" variant="outline" className="shrink-0">
              Buscar
            </Button>
          </form>

          <div className="space-y-2 sm:w-56">
            <Label>Categoría</Label>
            <Select
              items={categoryItems}
              value={query.servicesCategory ?? "all"}
              onValueChange={(value) => {
                if (value == null) return;
                router.push(
                  buildHref(providerId, query, {
                    servicesPage: 1,
                    servicesCategory: value === "all" ? undefined : value,
                  }),
                );
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categoryItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={servicesPage.items}
          manual
          hideToolbar
          hidePagination
          emptyMessage="No hay servicios. Sincroniza el provider para importarlos."
        />

        {servicesPage.total > 0 ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Mostrando {from}–{to} de {servicesPage.total} servicios
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={servicesPage.page <= 1}
                nativeButton={false}
                render={
                  <Link
                    href={buildHref(providerId, query, {
                      servicesPage: Math.max(1, servicesPage.page - 1),
                    })}
                  />
                }
              >
                Anterior
              </Button>
              <span className="text-sm tabular-nums text-muted-foreground">
                {servicesPage.page} / {servicesPage.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={servicesPage.page >= servicesPage.totalPages}
                nativeButton={false}
                render={
                  <Link
                    href={buildHref(providerId, query, {
                      servicesPage: Math.min(
                        servicesPage.totalPages,
                        servicesPage.page + 1,
                      ),
                    })}
                  />
                }
              >
                Siguiente
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
