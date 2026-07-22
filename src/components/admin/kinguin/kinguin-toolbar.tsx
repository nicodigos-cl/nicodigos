"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  HiChevronDown,
  HiOutlineCheckCircle,
  HiOutlineCollection,
  HiOutlineFilter,
  HiOutlineGlobe,
  HiOutlineRefresh,
  HiOutlineTag,
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
import { buildKinguinAdminHref } from "@/lib/kinguin/admin-url";
import { cn } from "@/lib/utils";
import type {
  KinguinChileFilter,
  KinguinImportedFilter,
  KinguinSearchQuery,
  KinguinTagFilter,
} from "@/lib/validations/kinguin";
import type { KinguinRegion } from "@/types/kinguin";

type KinguinToolbarProps = {
  query: KinguinSearchQuery;
  platforms: string[];
  regions: KinguinRegion[];
};

type FilterOverrides = Partial<{
  q: string | undefined;
  chile: KinguinChileFilter;
  platform: string | undefined;
  regionId: number | undefined;
  tag: KinguinTagFilter | undefined;
  imported: KinguinImportedFilter;
}>;

const chileOptions: Array<{
  value: KinguinChileFilter;
  label: string;
}> = [
  { value: "all", label: "Todas" },
  { value: "compatible", label: "OK Chile" },
  { value: "incompatible", label: "No Chile" },
];

const importedOptions: Array<{
  value: KinguinImportedFilter;
  label: string;
}> = [
  { value: "all", label: "Todas" },
  { value: "not_imported", label: "Sin importar" },
  { value: "imported", label: "Ya importados" },
];

const tagOptions: Array<{
  value: KinguinTagFilter;
  label: string;
}> = [
  { value: "base", label: "Base / juego" },
  { value: "dlc", label: "DLC" },
  { value: "software", label: "Software" },
  { value: "prepaid", label: "Prepaid" },
  { value: "indie valley", label: "Indie Valley" },
];

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

export function KinguinToolbar({
  query,
  platforms,
  regions,
}: KinguinToolbarProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const activeFilterCount = useMemo(
    () =>
      [
        query.chile !== "all" ? query.chile : null,
        query.platform,
        query.regionId,
        query.tag,
        query.imported !== "all" ? query.imported : null,
      ].filter(Boolean).length,
    [query.chile, query.imported, query.platform, query.regionId, query.tag],
  );

  const regionLabel = useMemo(() => {
    if (query.regionId == null) return null;
    return (
      regions.find((region) => region.id === query.regionId)?.name ??
      `Región #${query.regionId}`
    );
  }, [query.regionId, regions]);

  function apply(overrides: FilterOverrides) {
    router.push(buildKinguinAdminHref(query, overrides));
  }

  function clearFilters() {
    router.push(
      buildKinguinAdminHref(query, {
        chile: "all",
        platform: undefined,
        regionId: undefined,
        tag: undefined,
        imported: "all",
      }),
    );
    setOpen(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Kinguin
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Busca juegos en la API de Kinguin e impórtalos con todas sus ofertas.
          Filtra por compatibilidad Chile, plataforma, región o tipo.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SsrSearchInput
          value={query.q ?? ""}
          buildHref={(q) => buildKinguinAdminHref(query, { q })}
          placeholder="Buscar por nombre de juego..."
          aria-label="Buscar en Kinguin"
          className="w-full max-w-lg"
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
            className="w-[min(100vw-2rem,48rem)] max-w-none gap-0 p-0"
          >
            <PopoverHeader className="flex-row items-start justify-between gap-3 border-b border-border px-4 py-3">
              <div className="space-y-1">
                <PopoverTitle className="flex items-center gap-2 text-sm">
                  <HiOutlineFilter className="size-4 text-primary" />
                  Filtrar catálogo Kinguin
                </PopoverTitle>
                <PopoverDescription className="text-xs">
                  Chile, plataforma, región, tipo e importación.
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

            <div className="grid gap-0 sm:grid-cols-2 lg:grid-cols-3">
              <section className="border-b border-border p-3 sm:border-r lg:border-b-0">
                <div className="mb-2 flex items-center gap-1.5 px-1 text-xs font-medium text-muted-foreground">
                  <HiOutlineGlobe className="size-3.5" />
                  Chile
                </div>
                <div className="space-y-0.5">
                  {chileOptions.map((option) => (
                    <FilterOptionButton
                      key={option.value}
                      active={query.chile === option.value}
                      label={option.label}
                      onClick={() => apply({ chile: option.value })}
                    />
                  ))}
                </div>

                <div className="mb-2 mt-4 flex items-center gap-1.5 px-1 text-xs font-medium text-muted-foreground">
                  <HiOutlineCheckCircle className="size-3.5" />
                  Importación
                </div>
                <div className="space-y-0.5">
                  {importedOptions.map((option) => (
                    <FilterOptionButton
                      key={option.value}
                      active={query.imported === option.value}
                      label={option.label}
                      onClick={() => apply({ imported: option.value })}
                    />
                  ))}
                </div>
              </section>

              <section className="border-b border-border p-3 sm:border-r-0 lg:border-r lg:border-b-0">
                <div className="mb-2 flex items-center gap-1.5 px-1 text-xs font-medium text-muted-foreground">
                  <HiOutlineCollection className="size-3.5" />
                  Plataforma
                </div>
                <div className="max-h-64 space-y-0.5 overflow-y-auto">
                  <FilterOptionButton
                    active={!query.platform}
                    label="Todas"
                    onClick={() => apply({ platform: undefined })}
                  />
                  {platforms.map((platform) => (
                    <FilterOptionButton
                      key={platform}
                      active={query.platform === platform}
                      label={platform}
                      onClick={() => apply({ platform })}
                    />
                  ))}
                </div>
              </section>

              <section className="p-3">
                <div className="mb-2 flex items-center gap-1.5 px-1 text-xs font-medium text-muted-foreground">
                  <HiOutlineGlobe className="size-3.5" />
                  Región Kinguin
                </div>
                <div className="max-h-40 space-y-0.5 overflow-y-auto">
                  <FilterOptionButton
                    active={query.regionId == null}
                    label="Todas"
                    onClick={() => apply({ regionId: undefined })}
                  />
                  {regions.map((region) => (
                    <FilterOptionButton
                      key={region.id}
                      active={query.regionId === region.id}
                      label={region.name.trim() || `Región ${region.id}`}
                      onClick={() => apply({ regionId: region.id })}
                    />
                  ))}
                  {regions.length === 0 ? (
                    <p className="px-2.5 py-2 text-xs text-muted-foreground">
                      No se pudieron cargar regiones
                    </p>
                  ) : null}
                </div>

                <div className="mb-2 mt-4 flex items-center gap-1.5 px-1 text-xs font-medium text-muted-foreground">
                  <HiOutlineTag className="size-3.5" />
                  Tipo / tag
                </div>
                <div className="space-y-0.5">
                  <FilterOptionButton
                    active={!query.tag}
                    label="Todos"
                    onClick={() => apply({ tag: undefined })}
                  />
                  {tagOptions.map((option) => (
                    <FilterOptionButton
                      key={option.value}
                      active={query.tag === option.value}
                      label={option.label}
                      onClick={() => apply({ tag: option.value })}
                    />
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
              <Button type="button" size="sm" onClick={() => setOpen(false)}>
                Listo
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {query.chile !== "all" ? (
          <Badge variant="secondary" className="gap-1">
            <HiOutlineGlobe className="size-3" />
            {chileOptions.find((option) => option.value === query.chile)
              ?.label ?? query.chile}
            <button
              type="button"
              aria-label="Quitar filtro Chile"
              className="rounded-full p-0.5 hover:bg-foreground/10"
              onClick={() => apply({ chile: "all" })}
            >
              <HiOutlineX className="size-3" />
            </button>
          </Badge>
        ) : null}

        {query.platform ? (
          <Badge variant="secondary" className="gap-1">
            <HiOutlineCollection className="size-3" />
            {query.platform}
            <button
              type="button"
              aria-label="Quitar plataforma"
              className="rounded-full p-0.5 hover:bg-foreground/10"
              onClick={() => apply({ platform: undefined })}
            >
              <HiOutlineX className="size-3" />
            </button>
          </Badge>
        ) : null}

        {query.regionId != null ? (
          <Badge variant="secondary" className="gap-1">
            <HiOutlineGlobe className="size-3" />
            {regionLabel}
            <button
              type="button"
              aria-label="Quitar región"
              className="rounded-full p-0.5 hover:bg-foreground/10"
              onClick={() => apply({ regionId: undefined })}
            >
              <HiOutlineX className="size-3" />
            </button>
          </Badge>
        ) : null}

        {query.tag ? (
          <Badge variant="secondary" className="gap-1">
            <HiOutlineTag className="size-3" />
            {tagOptions.find((option) => option.value === query.tag)?.label ??
              query.tag}
            <button
              type="button"
              aria-label="Quitar tipo"
              className="rounded-full p-0.5 hover:bg-foreground/10"
              onClick={() => apply({ tag: undefined })}
            >
              <HiOutlineX className="size-3" />
            </button>
          </Badge>
        ) : null}

        {query.imported !== "all" ? (
          <Badge variant="secondary" className="gap-1">
            <HiOutlineCheckCircle className="size-3" />
            {importedOptions.find((option) => option.value === query.imported)
              ?.label ?? query.imported}
            <button
              type="button"
              aria-label="Quitar filtro de importación"
              className="rounded-full p-0.5 hover:bg-foreground/10"
              onClick={() => apply({ imported: "all" })}
            >
              <HiOutlineX className="size-3" />
            </button>
          </Badge>
        ) : null}
      </div>
    </div>
  );
}
