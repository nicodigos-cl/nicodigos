"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { IconPackage, IconSearch } from "@tabler/icons-react";
import {
  importKinguinProductAction,
  searchKinguinProductsAction,
} from "@/lib/admin/products/actions";
import type { KinguinSearchResultItem } from "@/lib/admin/products/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatSourceMoney } from "@/lib/admin/format";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

type CreateProductFromKinguinFormProps = {
  kinguinConfigured: boolean;
};

export function CreateProductFromKinguinForm({
  kinguinConfigured,
}: CreateProductFromKinguinFormProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<KinguinSearchResultItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const [searchMode, setSearchMode] = useState<"api" | "catalog" | null>(null);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [isSearching, startSearch] = useTransition();
  const [isImporting, startImport] = useTransition();

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    startSearch(async () => {
      const result = await searchKinguinProductsAction(query);
      setHasSearched(true);

      if (!result.success) {
        setResults([]);
        setError(result.error);
        return;
      }

      setResults(result.data.items);
      setFromCache(result.data.fromCache);
      setSearchMode(result.data.searchMode);
    });
  }

  function handleImport(productId: string) {
    setError(null);
    setSuccess(null);
    setImportingId(productId);

    startImport(async () => {
      const result = await importKinguinProductAction(productId);

      if (!result.success) {
        setError(result.error);
        setImportingId(null);
        return;
      }

      router.push(`/admin/products/${result.data.productId}/edit`);
      router.refresh();
    });
  }

  if (!kinguinConfigured) {
    return (
      <Alert variant="destructive">
        <AlertTitle>API de Kinguin no configurada</AlertTitle>
        <AlertDescription>
          Configura KINGUIN_API_KEY y KINGUIN_API_BASE en tu archivo .env para
          buscar e importar productos.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Buscar en Kinguin</CardTitle>
          <CardDescription>
            Escribe el nombre del juego o producto tal como aparece en Kinguin.
            Los resultados se importan al catálogo local con sus ofertas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="kinguin-search">
                  Nombre del producto
                </FieldLabel>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    id="kinguin-search"
                    name="query"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Ej. Elden Ring Steam"
                    autoComplete="off"
                    disabled={isSearching || isImporting}
                  />
                  <Button
                    type="submit"
                    disabled={
                      isSearching || isImporting || query.trim().length < 3
                    }
                    className="shrink-0"
                  >
                    {isSearching ? (
                      <Spinner className="size-4" />
                    ) : (
                      <IconSearch className="size-4" />
                    )}
                    Buscar
                  </Button>
                </div>
                <FieldDescription>
                  Mínimo 3 caracteres. En sandbox Kinguin el parámetro{" "}
                  <code className="text-xs">name</code> falla en su API; se
                  descarga el catálogo y se filtra aquí. En producción se usa{" "}
                  <code className="text-xs">?name=</code> directamente. Caché
                  Redis 15 min (búsqueda) y 1 h (catálogo).
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {success ? (
        <Alert>
          <AlertTitle>Listo</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      ) : null}

      {hasSearched && !isSearching && results.length === 0 && !error ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <IconPackage />
            </EmptyMedia>
            <EmptyTitle>Sin resultados</EmptyTitle>
            <EmptyDescription>
              Prueba con otro nombre o una variante más corta del título.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}

      {results.length > 0 ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-muted-foreground">
              {results.length} resultado{results.length === 1 ? "" : "s"}
            </p>
            {fromCache ? (
              <Badge variant="outline">Desde caché Redis</Badge>
            ) : null}
            {searchMode === "catalog" ? (
              <Badge variant="secondary">Filtro en catálogo (sandbox)</Badge>
            ) : searchMode === "api" ? (
              <Badge variant="secondary">API Kinguin ?name=</Badge>
            ) : null}
          </div>
          <ScrollArea className="h-[min(70vh,720px)] rounded-2xl border border-border pr-3">
            <ul className="space-y-3 p-1">
              {results.map((item) => {
                const isRowImporting =
                  isImporting && importingId === item.productId;

                return (
                  <li
                    key={`${item.kinguinId}-${item.productId}`}
                    className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      {item.coverImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.coverImageUrl}
                          alt=""
                          className="size-14 shrink-0 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-muted">
                          <IconPackage className="size-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium leading-snug">{item.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {item.platform} · Kinguin #{item.kinguinId}
                        </p>
                        <p className="mt-1 text-sm tabular-nums">
                          {formatSourceMoney(item.price, "EUR")} · Stock{" "}
                          {item.qty}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {item.isPreorder ? (
                            <Badge variant="outline">Preorder</Badge>
                          ) : null}
                          {item.alreadyImported ? (
                            <Badge variant="secondary">Ya importado</Badge>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      className="shrink-0 sm:w-auto"
                      disabled={
                        item.alreadyImported || isSearching || isRowImporting
                      }
                      onClick={() => handleImport(item.productId)}
                    >
                      {isRowImporting ? (
                        <>
                          <Spinner className="size-4" />
                          Importando…
                        </>
                      ) : (
                        "Importar"
                      )}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        </div>
      ) : null}
    </div>
  );
}
