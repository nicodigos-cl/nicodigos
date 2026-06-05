"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { IconPackage, IconSearch } from "@tabler/icons-react";
import {
  bulkImportKinguinProductsAction,
  importKinguinProductAction,
  searchKinguinProductsAction,
} from "@/lib/admin/products/actions";
import { slugify } from "@/lib/admin/products/slugify";
import type { BulkKinguinImportError } from "@/lib/admin/products/types";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type CreateProductFromKinguinFormProps = {
  kinguinConfigured: boolean;
  openAiConfigured: boolean;
};

const BULK_IMPORT_CONCURRENCY = 3;
const BULK_IMPORT_AI_CONCURRENCY = 2;
const BULK_IMPORT_BATCH_SIZE = 100;
const BULK_IMPORT_BATCH_CONCURRENCY = 2;

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
  const [pendingImport, setPendingImport] =
    useState<KinguinSearchResultItem | null>(null);
  const [importSlug, setImportSlug] = useState("");
  const [isSearching, startSearch] = useTransition();
  const [isImporting, startImport] = useTransition();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [translateWithAi, setTranslateWithAi] = useState(openAiConfigured);
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [hideAlreadyImported, setHideAlreadyImported] = useState(false);
  const [importedProductId, setImportedProductId] = useState<string | null>(
    null,
  );
  const [bulkImportProgress, setBulkImportProgress] = useState<{
    current: number;
    total: number;
    currentName: string;
    successCount: number;
    errors: BulkKinguinImportError[];
  } | null>(null);

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSelectedIds([]);
    setBulkImportProgress(null);
    setImportedProductId(null);

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

  function openImportDialog(item: KinguinSearchResultItem) {
    setError(null);
    setSuccess(null);
    setImportedProductId(null);
    setPendingImport(item);
    setImportSlug(slugify(item.name));
  }

  function handleImport(productId: string, slug: string) {
    setError(null);
    setSuccess(null);
    setImportedProductId(null);
    setImportingId(productId);

    const toastId = `import-${productId}`;
    toast.loading("Importando producto...", { id: toastId });

    startImport(async () => {
      try {
        const result = await importKinguinProductAction(productId, {
          translateWithAi,
          slug,
        });

        if (!result.success) {
          setError(result.error);
          toast.error(`Error al importar: ${result.error}`, { id: toastId });
          setImportingId(null);
          return;
        }

        setSuccess("¡Producto importado con éxito como borrador!");
        setImportedProductId(result.data.productId);
        toast.success("¡Producto importado con éxito!", { id: toastId });

        setResults((prev) =>
          prev.map((item) => {
            if (item.productId === productId) {
              return { ...item, alreadyImported: true };
            }
            return item;
          }),
        );

        setImportingId(null);
        setPendingImport(null);
        router.refresh();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        toast.error(`Error al importar: ${msg}`, { id: toastId });
        setImportingId(null);
      }
    });
  }

  function handleConfirmImport() {
    if (!pendingImport) return;

    const normalizedSlug = slugify(importSlug);
    if (!normalizedSlug) {
      toast.error("Ingresa un slug válido.");
      return;
    }

    handleImport(pendingImport.productId, normalizedSlug);
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

    const itemsToImport = selectedIds.map((productId) => {
      const item = results.find((result) => result.productId === productId);
      return {
        productId,
        name: item?.name ?? productId,
      };
    });
    const estimatedConcurrency = translateWithAi
      ? BULK_IMPORT_AI_CONCURRENCY
      : BULK_IMPORT_CONCURRENCY;
    const batchCount = Math.ceil(itemsToImport.length / BULK_IMPORT_BATCH_SIZE);
    const estimatedTotalConcurrency =
      estimatedConcurrency *
      Math.min(BULK_IMPORT_BATCH_CONCURRENCY, batchCount);

    setError(null);
    setSuccess(null);
    setImportedProductId(null);
    setIsBulkImporting(true);
    setBulkImportProgress({
      current: 0,
      total: itemsToImport.length,
      currentName: `${batchCount} batch${
        batchCount === 1 ? "" : "es"
      } de hasta ${BULK_IMPORT_BATCH_SIZE}`,
      successCount: 0,
      errors: [],
    });

    const toastId = "bulk-import";
    toast.loading(
      `Importando ${itemsToImport.length} productos en ${batchCount} batch${
        batchCount === 1 ? "" : "es"
      } con concurrencia total ${estimatedTotalConcurrency}...`,
      { id: toastId },
    );

    try {
      const result = await bulkImportKinguinProductsAction(itemsToImport, {
        translateWithAi,
      });

      if (!result.success) {
        setError(result.error);
        toast.error(`Error al importar: ${result.error}`, { id: toastId });
        return;
      }

      const {
        batchConcurrency,
        batchCount: completedBatchCount,
        batchSize,
        concurrency,
        errors,
        imported,
        requestedCount,
        successCount,
      } = result.data;
      const importedKinguinProductIds = new Set(
        imported.map((item) => item.kinguinProductId),
      );

      setBulkImportProgress({
        current: requestedCount,
        total: itemsToImport.length,
        currentName: `Finalizado en ${completedBatchCount} batch${
          completedBatchCount === 1 ? "" : "es"
        } de ${batchSize} con ${batchConcurrency} batch${
          batchConcurrency === 1 ? "" : "es"
        } simultáneo${batchConcurrency === 1 ? "" : "s"}`,
        successCount,
        errors,
      });

      if (errors.length > 0) {
        setError(
          `Se importaron ${successCount} productos con éxito. ${errors.length} fallaron:\n` +
            errors.map((e) => `- ${e.name}: ${e.error}`).join("\n"),
        );
        toast.error(
          `Importación masiva completada: ${successCount} éxito, ${errors.length} fallaron.`,
          { id: toastId },
        );
      } else {
        setSuccess(
          `¡Todos los ${successCount} productos fueron importados con éxito!`,
        );
        toast.success(
          `¡${successCount} productos importados en ${completedBatchCount} batch${
            completedBatchCount === 1 ? "" : "es"
          } con concurrencia total ${concurrency * batchConcurrency}!`,
          { id: toastId },
        );
      }

      setResults((prev) =>
        prev.map((item) => {
          if (importedKinguinProductIds.has(item.productId)) {
            return { ...item, alreadyImported: true };
          }
          return item;
        }),
      );

      setSelectedIds((prev) =>
        prev.filter((id) => !importedKinguinProductIds.has(id)),
      );

      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      toast.error(`Error al importar: ${msg}`, { id: toastId });
    } finally {
      setIsBulkImporting(false);
      setBulkImportProgress(null);
    }
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
          <AlertDescription className="whitespace-pre-line">
            {error}
          </AlertDescription>
        </Alert>
      ) : null}

      {success ? (
        <Alert>
          <AlertTitle>Listo</AlertTitle>
          <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>{success}</span>
            {importedProductId && (
              <Button size="sm" asChild className="mt-2 sm:mt-0 shrink-0">
                <Link href={`/admin/products/${importedProductId}/edit`}>
                  Editar producto
                </Link>
              </Button>
            )}
          </AlertDescription>
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
              Progreso: {bulkImportProgress.current} de{" "}
              {bulkImportProgress.total}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-3">
            <p className="font-medium text-foreground">
              Procesando:{" "}
              <span className="text-primary font-semibold">
                {bulkImportProgress.currentName}
              </span>
            </p>
            {bulkImportProgress.successCount > 0 ? (
              <p className="text-xs text-muted-foreground">
                Importados: {bulkImportProgress.successCount}
              </p>
            ) : null}
            {bulkImportProgress.errors.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-destructive">
                  Errores temporales ({bulkImportProgress.errors.length}):
                </p>
                <div className="max-h-24 overflow-y-auto text-xs text-muted-foreground space-y-1 rounded-md border border-border bg-card p-2">
                  {bulkImportProgress.errors.map((e) => (
                    <p key={e.id}>
                      • {e.name}: {e.error}
                    </p>
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
                  Todos los resultados de esta búsqueda ya están en tu catálogo
                  local.
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
                          <p className="font-medium leading-snug">
                            {item.name}
                          </p>
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
                        onClick={() => openImportDialog(item)}
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

      <Dialog
        open={pendingImport != null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingImport(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar producto</DialogTitle>
            <DialogDescription>
              Revisa el slug de la URL pública antes de crear el borrador local.
            </DialogDescription>
          </DialogHeader>

          {pendingImport ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-muted/20 p-3">
                <p className="font-medium leading-snug">{pendingImport.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {pendingImport.platform} · Kinguin #{pendingImport.kinguinId}
                </p>
              </div>

              <Field>
                <FieldLabel htmlFor="import-slug">Slug</FieldLabel>
                <Input
                  id="import-slug"
                  value={importSlug}
                  onChange={(event) => setImportSlug(event.target.value)}
                  placeholder="elden-ring-steam"
                  autoComplete="off"
                  disabled={isImporting}
                />
                <FieldDescription>
                  URL: /catalog/
                  {slugify(importSlug) || "tu-slug"}
                </FieldDescription>
              </Field>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="import-translate-with-ai"
                  checked={translateWithAi}
                  onCheckedChange={(checked) => setTranslateWithAi(!!checked)}
                  disabled={!openAiConfigured || isImporting}
                />
                <label
                  htmlFor="import-translate-with-ai"
                  className="text-sm font-medium leading-none cursor-pointer select-none"
                >
                  Traducir y mejorar con IA
                </label>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingImport(null)}
            >
              {isImporting ? "Cerrar" : "Cancelar"}
            </Button>
            <Button
              type="button"
              disabled={isImporting || !importSlug.trim()}
              onClick={handleConfirmImport}
            >
              {isImporting ? (
                <>
                  <Spinner className="size-4" />
                  Importando…
                </>
              ) : (
                "Importar borrador"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
