"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { HiOutlinePlus } from "react-icons/hi";

import { CategoryDialog } from "@/components/admin/categories/category-dialog";
import { CategoriesTree } from "@/components/admin/categories/categories-tree";
import { SsrSearchInput } from "@/components/admin/ssr-search-input";
import { Button } from "@/components/ui/button";
import type {
  CategoryParentOptionDto,
  CategoryTreeNodeDto,
} from "@/types/categories";

type CategoriesAdminClientProps = {
  initialTree: CategoryTreeNodeDto[];
  parentOptions: CategoryParentOptionDto[];
  q?: string;
  /** Opens the edit dialog when arriving from a legacy `/admin/categories/[id]` URL. */
  initialEditId?: string;
};

type DialogState =
  | { open: false }
  | { open: true; mode: "create" }
  | { open: true; mode: "edit"; categoryId: string };

function buildHref(q: string | undefined): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  const qs = params.toString();
  return qs ? `/admin/categories?${qs}` : "/admin/categories";
}

function collectSubtreeIds(node: CategoryTreeNodeDto): string[] {
  return [
    node.id,
    ...node.children.flatMap((child) => collectSubtreeIds(child)),
  ];
}

function findNode(
  nodes: CategoryTreeNodeDto[],
  id: string,
): CategoryTreeNodeDto | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const nested = findNode(node.children, id);
    if (nested) return nested;
  }
  return null;
}

export function CategoriesAdminClient({
  initialTree,
  parentOptions,
  q,
  initialEditId,
}: CategoriesAdminClientProps) {
  const router = useRouter();
  const [dialog, setDialog] = useState<DialogState>(() =>
    initialEditId
      ? { open: true, mode: "edit", categoryId: initialEditId }
      : { open: false },
  );

  const excludedParentIds = useMemo(() => {
    if (!dialog.open || dialog.mode !== "edit") return [];
    const node = findNode(initialTree, dialog.categoryId);
    return node ? collectSubtreeIds(node) : [dialog.categoryId];
  }, [dialog, initialTree]);

  useEffect(() => {
    if (!initialEditId) return;
    setDialog({ open: true, mode: "edit", categoryId: initialEditId });
  }, [initialEditId]);

  const clearEditParam = useCallback(() => {
    if (!initialEditId) return;
    router.replace(buildHref(q));
  }, [initialEditId, q, router]);

  const openCreate = useCallback(() => {
    setDialog({ open: true, mode: "create" });
  }, []);

  const openEdit = useCallback((categoryId: string) => {
    setDialog({ open: true, mode: "edit", categoryId });
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              Categorías
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Organiza el catálogo en un árbol. Arrastra para reordenar hermanos.
            </p>
          </div>
          <Button type="button" className="shrink-0" onClick={openCreate}>
            <HiOutlinePlus className="size-4" />
            Añadir categoría
          </Button>
        </div>

        <SsrSearchInput
          value={q ?? ""}
          buildHref={(nextQ) => buildHref(nextQ || undefined)}
          placeholder="Buscar categorías..."
          aria-label="Buscar categorías"
          className="w-full max-w-sm sm:w-72"
        />
      </div>

      <CategoriesTree
        initialTree={initialTree}
        searchActive={Boolean(q)}
        onCreate={openCreate}
        onEdit={openEdit}
      />

      <CategoryDialog
        open={dialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setDialog({ open: false });
            clearEditParam();
          }
        }}
        mode={dialog.open ? dialog.mode : "create"}
        categoryId={
          dialog.open && dialog.mode === "edit" ? dialog.categoryId : null
        }
        parentOptions={parentOptions}
        excludedParentIds={excludedParentIds}
      />
    </div>
  );
}
