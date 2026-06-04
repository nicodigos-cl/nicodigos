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
import { Checkbox } from "@/components/ui/checkbox";

type CreateProductFromKinguinFormProps = {
  kinguinConfigured: boolean;
  openAiConfigured: boolean;
};

export function CreateProductFromKinguinForm({
  kinguinConfigured,
  openAiConfigured,
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

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [translateWithAi, setTranslateWithAi] = useState(openAiConfigured);
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [hideAlreadyImported, setHideAlreadyImported] = useState(false);
  const [bulkImportProgress, setBulkImportProgress] = useState<{
    current: number;
    total: number;
    currentName: string;
    successCount: number;
    errors: { id: string; name: string; error: string }[];
  } | null>(null);

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSelectedIds([]);
    setBulkImportProgress(null);

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
      const result = await importKinguinProductAction(productId, {
        translateWithAi,
      });

      if (!result.success) {
        setError(result.error);
        setImportingId(null);
        return;
      }

      router.push(`/admin/products/${result.data.productId}/edit`);
      router.refresh();
    });
  }

  const importableResults = results.filter((item) => !item.alreadyImported);
  const displayedResults = hideAlreadyImported ? importableResults : results;

  function handleSelectAll(checked: boolean) {
    if (checked) {
      setSelectedIds(importableResults.map((item) => item.productId));
    } else {
      setSelectedIds([]);
    }
  }

  function handleSelectRow(productId: string, checked: boolean) {
    if (checked) {
      setSelectedIds((prev) => [...prev, productId]);
    } else {
      setSelectedIds((prev) => prev.filter((id) => id !== productId));
    }
  }

  async function handleBulkImport() {
    if (selectedIds.length === 0) return;
    setError(null);
    setSuccess(null);
    setIsBulkImporting(true);

    const errors: { id: string; name: string; error: string }[] = [];
    let successCount = 0;
    const total = selectedIds.length;

    for (let i = 0; i < total; i++) {
      const productId = selectedIds[i];
      const item = results.find((r) => r.productId === productId);
      const name = item ? item.name : productId;

      setBulkImportProgress({
        current: i + 1,
        total,
        currentName: name,
        successCount,
        errors: [...errors],
      });

      try {
        const result = await importKinguinProductAction(productId, {
          translateWithAi,
        });

        if (!result.success) {
          errors.push({
            id: productId,
            name,
            error: result.error || "Error desconocido",
          });
        } else {
          successCount++;
        }
      } catch (err) {
        errors.push({
          id: productId,
          name,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    setIsBulkImporting(false);
    setBulkImportProgress(null);
    setSelectedIds([]);

    if (errors.length > 0) {
      setError(
        `Se importaron ${successCount} productos con éxito. ${errors.length} fallaron:\n` +
          errors.map((e) => `- ${e.name}: ${e.error}`).join("\n")
      );
    } else {
      setSuccess(
        `¡Todos los ${successCount} productos fueron importados con éxito!`
      );
    }

    setResults((prev) =>
      prev.map((item) => {
        if (
          selectedIds.includes(item.productId) &&
          !errors.some((e) => e.id === item.productId)
        ) {
          return { ...item, alreadyImported: true };
        }
        return item;
      })
    );

    router.refresh();
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
            Escribe el nombre de la key o producto tal como aparece en Kinguin.
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
                    disabled={isSearching || isImporting || isBulkImporting}
                  />
                  <Button
                    type="submit"
                    disabled={
                      isSearching ||
                      isImporting ||
                      isBulkImporting ||
                      query.trim().length < 3
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
          <AlertDescription className="whitespace-pre-line">{error}</AlertDescription>
        </Alert>
      ) : null}

      {success ? (
        <Alert>
          <AlertTitle>Listo</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      ) : null}

      {isBulkImporting && bulkImportProgress ? (
        <Card className="border-primary bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Spinner className="size-4" />
              Importando productos en masa...
            </CardTitle>
            <CardDescription>
              Progreso: {bulkImportProgress.current} de {bulkImportProgress.total}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-3">
            <p className="font-medium text-foreground">
              Procesando: <span className="text-primary font-semibold">{bulkImportProgress.currentName}</span>
            </p>
            {bulkImportProgress.errors.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-destructive">
                  Errores temporales ({bulkImportProgress.errors.length}):
                </p>
                <div className="max-h-24 overflow-y-auto text-xs text-muted-foreground space-y-1 rounded-md border border-border bg-card p-2">
                  {bulkImportProgress.errors.map((e) => (
                    <p key={e.id}>• {e.name}: {e.error}</p>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
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
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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

            <div className="flex items-center gap-2">
              <Checkbox
                id="hide-imported"
                checked={hideAlreadyImported}
                onCheckedChange={(checked) => setHideAlreadyImported(!!checked)}
                disabled={isSearching || isImporting || isBulkImporting}
              />
              <label
                htmlFor="hide-imported"
                className="text-sm font-medium leading-none cursor-pointer select-none text-muted-foreground hover:text-foreground"
              >
                Ocultar ya importados
              </label>
            </div>
          </div>

          {importableResults.length > 0 ? (
            <Card className="p-4 border-border bg-card/50">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="select-all"
                      checked={
                        selectedIds.length === importableResults.length &&
                        importableResults.length > 0
                      }
                      onCheckedChange={(checked) => handleSelectAll(!!checked)}
                      disabled={isSearching || isImporting || isBulkImporting}
                    />
                    <label
                      htmlFor="select-all"
                      className="text-sm font-medium leading-none cursor-pointer select-none"
                    >
                      Seleccionar todo ({importableResults.length})
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="bulk-translate-with-ai"
                      checked={translateWithAi}
                      onCheckedChange={(checked) =>
                        setTranslateWithAi(!!checked)
                      }
                      disabled={
                        !openAiConfigured ||
                        isSearching ||
                        isImporting ||
                        isBulkImporting
                      }
                    />
                    <label
                      htmlFor="bulk-translate-with-ai"
                      className="text-sm font-medium leading-none cursor-pointer select-none flex items-center gap-1.5"
                    >
                      Traducir y mejorar con IA
                      {!openAiConfigured && (
                        <span className="text-xs text-destructive font-normal">
                          (No configurado)
                        </span>
                      )}
                    </label>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleBulkImport}
                  disabled={
                    selectedIds.length === 0 ||
                    isSearching ||
                    isImporting ||
                    isBulkImporting
                  }
                  className="sm:w-auto w-full"
                >
                  {isBulkImporting ? (
                    <>
                      <Spinner className="size-4" />
                      Importando...
                    </>
                  ) : (
                    `Importar seleccionados (${selectedIds.length})`
                  )}
                </Button>
              </div>
            </Card>
          ) : null}

          {displayedResults.length === 0 && results.length > 0 ? (
            <Empty className="border border-dashed py-8">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <IconPackage />
                </EmptyMedia>
                <EmptyTitle>Todos importados</EmptyTitle>
                <EmptyDescription>
                  Todos los resultados de esta búsqueda ya están en tu catálogo local.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ScrollArea className="h-[min(70vh,720px)] rounded-2xl border border-border pr-3">
              <ul className="space-y-3 p-1">
                {displayedResults.map((item) => {
                  const isRowImporting =
                    isImporting && importingId === item.productId;

                  return (
                    <li
                      key={`${item.kinguinId}-${item.productId}`}
                      className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center"
                    >
                      {!item.alreadyImported ? (
                        <div className="flex items-center justify-center shrink-0 sm:pr-1">
                          <Checkbox
                            checked={selectedIds.includes(item.productId)}
                            onCheckedChange={(checked) =>
                              handleSelectRow(item.productId, !!checked)
                            }
                            disabled={
                              isSearching || isImporting || isBulkImporting
                            }
                            aria-label={`Seleccionar ${item.name}`}
                          />
                        </div>
                      ) : (
                        <div className="size-4 shrink-0" />
                      )}

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
                          item.alreadyImported ||
                          isSearching ||
                          isRowImporting ||
                          isBulkImporting
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
          )}
        </div>
      ) : null}
    </div>
  );
}
