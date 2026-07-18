"use client";

import { SsrSearchInput } from "@/components/admin/ssr-search-input";
import type { KinguinSearchQuery } from "@/lib/validations/kinguin";

type KinguinToolbarProps = {
  query: KinguinSearchQuery;
};

function buildHref(query: KinguinSearchQuery, q: string | undefined): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (query.pageSize !== 20) params.set("pageSize", String(query.pageSize));
  const qs = params.toString();
  return qs ? `/admin/kinguin?${qs}` : "/admin/kinguin";
}

export function KinguinToolbar({ query }: KinguinToolbarProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Kinguin
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Busca juegos en la API de Kinguin e impórtalos con todas sus ofertas.
          El catálogo remoto no se cachea completo.
        </p>
      </div>

      <SsrSearchInput
        value={query.q ?? ""}
        buildHref={(q) => buildHref(query, q)}
        placeholder="Buscar por nombre de juego..."
        aria-label="Buscar en Kinguin"
        className="w-full max-w-lg"
      />
    </div>
  );
}
