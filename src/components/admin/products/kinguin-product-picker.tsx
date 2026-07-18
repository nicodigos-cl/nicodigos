"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { HiOutlineCheck, HiOutlineSearch } from "react-icons/hi";

import { SsrSearchInput } from "@/components/admin/ssr-search-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";
import type { KinguinSearchHitDto } from "@/types/kinguin-admin";

type KinguinProductPickerProps = {
  items: KinguinSearchHitDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  q: string | undefined;
  selectedKinguinId: number | null;
  onSelect: (hit: KinguinSearchHitDto) => void;
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
    params.set("kinguinQ", overrides.q);
  } else {
    params.delete("kinguinQ");
  }

  if (overrides.page && overrides.page > 1) {
    params.set("kinguinPage", String(overrides.page));
  } else {
    params.delete("kinguinPage");
  }

  const qs = params.toString();
  return qs ? `/admin/products/new?${qs}` : "/admin/products/new";
}

function CoverThumb({ src }: { src: string | null }) {
  return (
    <div className="relative size-9 shrink-0 overflow-hidden rounded-lg bg-muted">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="size-full object-cover" />
      ) : null}
    </div>
  );
}

export function KinguinProductPicker({
  items,
  total,
  page,
  pageSize,
  totalPages,
  q,
  selectedKinguinId,
  onSelect,
  onClear,
}: KinguinProductPickerProps) {
  const router = useRouter();
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const hasQuery = Boolean(q?.trim());

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-muted/20 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">Producto Kinguin</p>
          <p className="text-xs text-muted-foreground">
            Busca y enlaza el juego remoto. Se rellenan nombre, precio sugerido y
            stock.
          </p>
        </div>
        {selectedKinguinId != null ? (
          <Button type="button" variant="ghost" size="xs" onClick={onClear}>
            Quitar selección
          </Button>
        ) : null}
      </div>

      <SsrSearchInput
        value={q ?? ""}
        buildHref={(nextQ) => buildPickerHref({ q: nextQ, page: 1 })}
        placeholder="Buscar por nombre en Kinguin..."
        aria-label="Buscar productos Kinguin"
        className="w-full"
      />

      {!hasQuery ? (
        <Empty className="rounded-xl border border-border bg-card p-8">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HiOutlineSearch className="size-5" />
            </EmptyMedia>
            <EmptyTitle>Busca un juego</EmptyTitle>
            <EmptyDescription>
              Escribe un nombre para consultar el catálogo de Kinguin y
              enlazarlo a este producto.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : items.length === 0 ? (
        <Empty className="rounded-xl border border-border bg-card p-8">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HiOutlineSearch className="size-5" />
            </EmptyMedia>
            <EmptyTitle>Sin resultados</EmptyTitle>
            <EmptyDescription>
              No hay juegos que coincidan con “{q}”.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="max-h-64 overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-muted/80 text-xs text-muted-foreground backdrop-blur">
                <tr>
                  <th className="px-3 py-2 font-medium">Juego</th>
                  <th className="px-3 py-2 font-medium">Platform</th>
                  <th className="px-3 py-2 font-medium">EUR</th>
                  <th className="px-3 py-2 font-medium">Ofertas</th>
                  <th className="w-24 px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {items.map((hit) => {
                  const selected = hit.kinguinId === selectedKinguinId;
                  const disabled = hit.alreadyImported;
                  return (
                    <tr
                      key={hit.kinguinId}
                      className={cn(
                        "border-t border-border transition-colors",
                        disabled
                          ? "opacity-60"
                          : "cursor-pointer hover:bg-muted/50",
                        selected && "bg-primary/5",
                      )}
                      onClick={() => {
                        if (disabled) return;
                        onSelect(hit);
                      }}
                    >
                      <td className="max-w-52 px-3 py-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <CoverThumb
                            src={hit.coverThumbnailUrl || hit.coverUrl}
                          />
                          <div className="min-w-0">
                            <p className="truncate font-medium">{hit.name}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              #{hit.kinguinId}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="max-w-24 truncate px-3 py-2 text-muted-foreground">
                        {hit.platform ?? "—"}
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        {hit.priceEur != null
                          ? `€${hit.priceEur.toFixed(2)}`
                          : "—"}
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        {hit.offersCount}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {disabled && hit.localProductId ? (
                          <Badge variant="secondary" className="text-[10px]">
                            Ya importado
                          </Badge>
                        ) : selected ? (
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

      {hasQuery ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            {total === 0 ? "0 resultados" : `${from}–${to} de ${total}`}
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
              render={<Link href="/admin/kinguin" />}
            >
              Catálogo
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
