"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { HiOutlineCheck, HiOutlineCollection } from "react-icons/hi";

import { SsrSearchInput } from "@/components/admin/ssr-search-input";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";
import type { SmmServiceListItemDto } from "@/types/smm-provider";

type SmmServicePickerProps = {
  items: SmmServiceListItemDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  q: string | undefined;
  selectedId: string | null;
  onSelect: (service: SmmServiceListItemDto) => void;
  onClear: () => void;
};

function buildPickerHref(overrides: {
  q?: string | undefined;
  page?: number;
}): string {
  const params = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : "",
  );

  if (overrides.q) {
    params.set("serviceQ", overrides.q);
  } else {
    params.delete("serviceQ");
  }

  if (overrides.page && overrides.page > 1) {
    params.set("servicePage", String(overrides.page));
  } else {
    params.delete("servicePage");
  }

  const qs = params.toString();
  return qs ? `/admin/products/new?${qs}` : "/admin/products/new";
}

export function SmmServicePicker({
  items,
  total,
  page,
  pageSize,
  totalPages,
  q,
  selectedId,
  onSelect,
  onClear,
}: SmmServicePickerProps) {
  const router = useRouter();
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-muted/20 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">Servicio SMM</p>
          <p className="text-xs text-muted-foreground">
            Elige el servicio del panel. Se rellenan nombre, precio sugerido y
            stock (textQty).
          </p>
        </div>
        {selectedId ? (
          <Button type="button" variant="ghost" size="xs" onClick={onClear}>
            Quitar selección
          </Button>
        ) : null}
      </div>

      <SsrSearchInput
        value={q ?? ""}
        buildHref={(nextQ) => buildPickerHref({ q: nextQ, page: 1 })}
        placeholder="Buscar servicio, categoría, provider o ID..."
        aria-label="Buscar servicios SMM"
        className="w-full"
      />

      {items.length === 0 ? (
        <Empty className="rounded-xl border border-border bg-card p-8">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HiOutlineCollection className="size-5" />
            </EmptyMedia>
            <EmptyTitle>Sin servicios</EmptyTitle>
            <EmptyDescription>
              No hay servicios para mostrar. Sincroniza un provider o ajusta la
              búsqueda.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="max-h-64 overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-muted/80 text-xs text-muted-foreground backdrop-blur">
                <tr>
                  <th className="px-3 py-2 font-medium">Servicio</th>
                  <th className="px-3 py-2 font-medium">Categoría</th>
                  <th className="px-3 py-2 font-medium">Rate USD</th>
                  <th className="px-3 py-2 font-medium">Provider</th>
                  <th className="w-10 px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {items.map((service) => {
                  const selected = service.id === selectedId;
                  return (
                    <tr
                      key={service.id}
                      className={cn(
                        "border-t border-border cursor-pointer transition-colors hover:bg-muted/50",
                        selected && "bg-primary/5",
                      )}
                      onClick={() => onSelect(service)}
                    >
                      <td className="max-w-48 px-3 py-2">
                        <p className="truncate font-medium">{service.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          #{service.remoteServiceId} · {service.type}
                        </p>
                      </td>
                      <td className="max-w-32 truncate px-3 py-2 text-muted-foreground">
                        {service.category}
                      </td>
                      <td className="px-3 py-2 tabular-nums">{service.rate}</td>
                      <td className="max-w-28 truncate px-3 py-2 text-muted-foreground">
                        {service.providerName}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {selected ? (
                          <HiOutlineCheck className="mx-auto size-4 text-primary" />
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {total === 0
            ? "0 resultados"
            : `${from}–${to} de ${total}`}
        </span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="xs"
            disabled={page <= 1}
            onClick={() =>
              router.push(buildPickerHref({ q, page: Math.max(1, page - 1) }))
            }
          >
            Anterior
          </Button>
          <Button
            type="button"
            variant="outline"
            size="xs"
            disabled={page >= totalPages}
            onClick={() =>
              router.push(
                buildPickerHref({ q, page: Math.min(totalPages, page + 1) }),
              )
            }
          >
            Siguiente
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            nativeButton={false}
            render={<Link href="/admin/services" />}
          >
            Ver todos
          </Button>
        </div>
      </div>
    </div>
  );
}
