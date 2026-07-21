"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { HiOutlineKey, HiOutlinePlus, HiOutlineTrash } from "react-icons/hi";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table";
import { confirmDialog } from "@/components/confirm-dialog";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  addProductKeysAction,
  revokeProductKeyAction,
} from "@/lib/actions/products";
import { formatDateTime } from "@/lib/format-date";
import { productKeyStatusLabel } from "@/lib/products/status";
import type { ProductKeyDto, ProductKeysPageResult } from "@/types/products";
import type { ProductKeysQuery } from "@/lib/validations/products";

type ProductKeysManagerProps = {
  productId: string;
  keysPage: ProductKeysPageResult;
  query: ProductKeysQuery;
};

function buildKeysHref(
  productId: string,
  query: ProductKeysQuery,
  overrides: Partial<ProductKeysQuery>,
): string {
  const next = { ...query, ...overrides };
  const params = new URLSearchParams();

  if (next.keysPage > 1) params.set("keysPage", String(next.keysPage));
  if (next.keysPageSize !== 10) {
    params.set("keysPageSize", String(next.keysPageSize));
  }
  if (next.keysQuery) params.set("keysQuery", next.keysQuery);
  if (next.keysStatus) params.set("keysStatus", next.keysStatus);

  const qs = params.toString();
  return qs
    ? `/admin/products/${productId}?${qs}`
    : `/admin/products/${productId}`;
}

function keyStatusBadgeVariant(
  status: ProductKeyDto["status"],
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "AVAILABLE":
      return "default";
    case "RESERVED":
      return "secondary";
    case "SOLD":
      return "outline";
    case "REVOKED":
      return "destructive";
  }
}

export function ProductKeysManager({
  productId,
  keysPage,
  query,
}: ProductKeysManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [codesText, setCodesText] = useState("");
  const [searchValue, setSearchValue] = useState(query.keysQuery ?? "");

  const lineStats = useMemo(() => {
    const lines = codesText.split(/\r?\n/).map((line) => line.trim());
    const nonEmpty = lines.filter(Boolean);
    const seen = new Set<string>();
    let duplicates = 0;
    for (const code of nonEmpty) {
      const key = code.toLowerCase();
      if (seen.has(key)) {
        duplicates += 1;
      } else {
        seen.add(key);
      }
    }
    return {
      valid: seen.size,
      duplicates,
    };
  }, [codesText]);

  const columns = useMemo<ColumnDef<ProductKeyDto>[]>(() => {
    const offset = (keysPage.page - 1) * keysPage.pageSize;

    return [
      {
        id: "number",
        header: "Nº",
        cell: ({ row }) => (
          <span className="tabular-nums text-muted-foreground">
            {offset + row.index + 1}
          </span>
        ),
      },
      {
        accessorKey: "code",
        header: "Key / código",
        cell: ({ row }) => (
          <code className="rounded-md bg-muted px-1.5 py-0.5 text-xs">
            {row.original.code}
          </code>
        ),
      },
      {
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => (
          <Badge variant={keyStatusBadgeVariant(row.original.status)}>
            {productKeyStatusLabel(row.original.status)}
          </Badge>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Fecha de adición",
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      },
      {
        id: "actions",
        header: "Acción",
        cell: ({ row }) => {
          const key = row.original;
          if (!key.canRevoke) {
            return <span className="text-xs text-muted-foreground">—</span>;
          }

          return (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isPending}
              onClick={() => {
                void (async () => {
                  const confirmed = await confirmDialog.warning({
                    title: "Revocar key",
                    description:
                      "¿Revocar esta key? No se eliminará físicamente.",
                    confirmLabel: "Revocar",
                  });
                  if (!confirmed) return;

                  startTransition(() => {
                    void (async () => {
                      const result = await revokeProductKeyAction({
                        productId,
                        keyId: key.id,
                      });
                      if (!result.success) {
                        toast.error(result.message);
                        return;
                      }
                      toast.success("Key revocada");
                      router.refresh();
                    })();
                  });
                })();
              }}
            >
              <HiOutlineTrash className="size-4" />
              Revocar
            </Button>
          );
        },
      },
    ];
  }, [isPending, keysPage.page, keysPage.pageSize, productId, router]);

  function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    router.push(
      buildKeysHref(productId, query, {
        keysPage: 1,
        keysQuery: searchValue.trim() || undefined,
      }),
    );
  }

  function handleAddBatch() {
    startTransition(() => {
      void (async () => {
        const result = await addProductKeysAction({
          productId,
          codesText,
        });

        if (!result.success) {
          toast.error(result.message);
          return;
        }

        toast.success(
          `Creadas: ${result.data.created}. Ignoradas: ${result.data.skipped}. Duplicadas en lote: ${result.data.duplicatesInBatch}.`,
        );
        setCodesText("");
        setDialogOpen(false);
        router.refresh();
      })();
    });
  }

  const from =
    keysPage.total === 0 ? 0 : (keysPage.page - 1) * keysPage.pageSize + 1;
  const to = Math.min(keysPage.page * keysPage.pageSize, keysPage.total);

  return (
    <Card className="shadow-none ring-border">
      <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <HiOutlineKey className="size-4" />
            Gestión de keys
          </CardTitle>
          <CardDescription>
            Códigos de activación del producto. Paginación independiente del
            listado principal.
          </CardDescription>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button type="button" className="shrink-0" />}>
            <HiOutlinePlus className="size-4" />
            Añadir lote
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Añadir lote de keys</DialogTitle>
              <DialogDescription>
                Una key por línea. Se omitirán duplicados dentro del lote y los
                que ya existan para este producto.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Textarea
                value={codesText}
                onChange={(event) => setCodesText(event.target.value)}
                placeholder={"AAAA-BBBB-CCCC\nDDDD-EEEE-FFFF"}
                rows={10}
              />
              <p className="text-sm text-muted-foreground">
                Líneas válidas:{" "}
                <span className="font-medium text-foreground">
                  {lineStats.valid}
                </span>
                {" · "}
                Duplicadas en lote:{" "}
                <span className="font-medium text-foreground">
                  {lineStats.duplicates}
                </span>
              </p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={isPending || lineStats.valid === 0}
                onClick={handleAddBatch}
              >
                {isPending ? "Procesando..." : "Confirmar lote"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <form onSubmit={handleSearch} className="flex min-w-0 flex-1 gap-2">
            <div className="min-w-0 flex-1 space-y-2">
              <Label htmlFor="keysQuery">Buscar por código</Label>
              <Input
                id="keysQuery"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Buscar key..."
              />
            </div>
            <Button type="submit" variant="outline" className="shrink-0">
              Buscar
            </Button>
          </form>

          <div className="space-y-2 sm:w-48">
            <Label>Estado</Label>
            <Select
              items={[
                { value: "all", label: "Todos" },
                { value: "AVAILABLE", label: "Disponible" },
                { value: "RESERVED", label: "Reservada" },
                { value: "SOLD", label: "Vendida" },
                { value: "REVOKED", label: "Revocada" },
              ]}
              value={query.keysStatus ?? "all"}
              onValueChange={(value) => {
                if (value == null) return;
                router.push(
                  buildKeysHref(productId, query, {
                    keysPage: 1,
                    keysStatus:
                      value === "all"
                        ? undefined
                        : (value as ProductKeysQuery["keysStatus"]),
                  }),
                );
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="AVAILABLE">Disponible</SelectItem>
                <SelectItem value="RESERVED">Reservada</SelectItem>
                <SelectItem value="SOLD">Vendida</SelectItem>
                <SelectItem value="REVOKED">Revocada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={keysPage.items}
          manual
          hideToolbar
          hidePagination
          emptyMessage="No hay keys para mostrar."
        />

        {keysPage.total > 0 ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Mostrando {from}–{to} de {keysPage.total} keys
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={keysPage.page <= 1}
                nativeButton={false}
                render={
                  <Link
                    href={buildKeysHref(productId, query, {
                      keysPage: Math.max(1, keysPage.page - 1),
                    })}
                  />
                }
              >
                Anterior
              </Button>
              <span className="text-sm tabular-nums text-muted-foreground">
                {keysPage.page} / {keysPage.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={keysPage.page >= keysPage.totalPages}
                nativeButton={false}
                render={
                  <Link
                    href={buildKeysHref(productId, query, {
                      keysPage: Math.min(
                        keysPage.totalPages,
                        keysPage.page + 1,
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
