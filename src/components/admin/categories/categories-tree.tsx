"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  HiChevronDown,
  HiChevronRight,
  HiOutlineFolder,
  HiOutlineMenu,
  HiOutlinePencil,
  HiOutlineTrash,
} from "react-icons/hi";
import { toast } from "sonner";

import { CreateCategoryDialog } from "@/components/admin/categories/create-category-dialog";
import { confirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  deleteCategoryAction,
  reorderCategoriesAction,
} from "@/lib/actions/categories";
import { cn } from "@/lib/utils";
import type {
  CategoryParentOptionDto,
  CategoryTreeNodeDto,
} from "@/types/categories";

type CategoriesTreeProps = {
  initialTree: CategoryTreeNodeDto[];
  parentOptions: CategoryParentOptionDto[];
  searchActive: boolean;
};

function cloneTree(nodes: CategoryTreeNodeDto[]): CategoryTreeNodeDto[] {
  return nodes.map((node) => ({
    ...node,
    children: cloneTree(node.children),
  }));
}

function replaceSiblings(
  nodes: CategoryTreeNodeDto[],
  parentId: string | null,
  nextSiblings: CategoryTreeNodeDto[],
): CategoryTreeNodeDto[] {
  if (parentId == null) return nextSiblings;
  return nodes.map((node) => {
    if (node.id === parentId) {
      return { ...node, children: nextSiblings };
    }
    return {
      ...node,
      children: replaceSiblings(node.children, parentId, nextSiblings),
    };
  });
}

type SortableRowProps = {
  node: CategoryTreeNodeDto;
  depth: number;
  collapsed: boolean;
  onToggle: () => void;
  onDeleted: (id: string) => void;
  dndEnabled: boolean;
};

function SortableCategoryRow({
  node,
  depth,
  collapsed,
  onToggle,
  onDeleted,
  dndEnabled,
}: SortableRowProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: node.id,
    disabled: !dndEnabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 rounded-xl border border-border bg-card px-2 py-2",
        isDragging && "z-10 opacity-80 shadow-md",
      )}
    >
      <button
        type="button"
        className={cn(
          "inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted",
          !dndEnabled && "pointer-events-none opacity-40",
        )}
        aria-label="Arrastrar"
        {...attributes}
        {...listeners}
      >
        <HiOutlineMenu className="size-4" />
      </button>

      <div style={{ width: depth * 16 }} className="shrink-0" />

      {node.children.length > 0 ? (
        <button
          type="button"
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
          onClick={onToggle}
          aria-label={collapsed ? "Expandir" : "Colapsar"}
        >
          {collapsed ? (
            <HiChevronRight className="size-4" />
          ) : (
            <HiChevronDown className="size-4" />
          )}
        </button>
      ) : (
        <span className="size-7 shrink-0" />
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{node.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          /{node.slug}
          {node.productsCount > 0
            ? ` · ${node.productsCount} producto${node.productsCount === 1 ? "" : "s"}`
            : null}
        </p>
      </div>

      {node.imageUrl ? (
        <span className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-muted ring-1 ring-border/60">
          <Image
            src={node.imageUrl}
            alt=""
            fill
            unoptimized
            className="object-cover"
            sizes="40px"
          />
        </span>
      ) : (
        <span
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground ring-1 ring-border/60"
          aria-hidden
        >
          <HiOutlineFolder className="size-4" />
        </span>
      )}

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        render={<Link href={`/admin/categories/${node.id}`} />}
        nativeButton={false}
        aria-label="Editar"
      >
        <HiOutlinePencil className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={isPending || undefined}
        aria-label="Eliminar"
        onClick={() => {
          void (async () => {
            const confirmed = await confirmDialog.danger({
              title: "Eliminar categoría",
              description: `¿Eliminar “${node.name}”?`,
              confirmLabel: "Eliminar",
            });
            if (!confirmed) return;
            startTransition(() => {
              void (async () => {
                const result = await deleteCategoryAction({ id: node.id });
                if (!result.success) {
                  toast.error(result.message);
                  return;
                }
                toast.success("Categoría eliminada");
                onDeleted(node.id);
                router.refresh();
              })();
            });
          })();
        }}
      >
        <HiOutlineTrash className="size-4" />
      </Button>
    </div>
  );
}

type TreeBranchProps = {
  nodes: CategoryTreeNodeDto[];
  parentId: string | null;
  depth: number;
  collapsedIds: Set<string>;
  onToggle: (id: string) => void;
  onDeleted: (id: string) => void;
  dndEnabled: boolean;
};

function TreeBranch({
  nodes,
  parentId,
  depth,
  collapsedIds,
  onToggle,
  onDeleted,
  dndEnabled,
}: TreeBranchProps) {
  const ids = useMemo(() => nodes.map((node) => node.id), [nodes]);

  return (
    <SortableContext
      id={parentId ?? "root"}
      items={ids}
      strategy={verticalListSortingStrategy}
    >
      <div className="flex flex-col gap-1.5">
        {nodes.map((node) => {
          const collapsed = collapsedIds.has(node.id);
          return (
            <div key={node.id} className="flex flex-col gap-1.5">
              <SortableCategoryRow
                node={node}
                depth={depth}
                collapsed={collapsed}
                onToggle={() => onToggle(node.id)}
                onDeleted={onDeleted}
                dndEnabled={dndEnabled}
              />
              {!collapsed && node.children.length > 0 ? (
                <TreeBranch
                  nodes={node.children}
                  parentId={node.id}
                  depth={depth + 1}
                  collapsedIds={collapsedIds}
                  onToggle={onToggle}
                  onDeleted={onDeleted}
                  dndEnabled={dndEnabled}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </SortableContext>
  );
}

export function CategoriesTree({
  initialTree,
  parentOptions,
  searchActive,
}: CategoriesTreeProps) {
  const router = useRouter();
  const [tree, setTree] = useState(() => cloneTree(initialTree));
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set());
  const [isSaving, startSave] = useTransition();

  useEffect(() => {
    setTree(cloneTree(initialTree));
  }, [initialTree]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const dndEnabled = !searchActive && !isSaving;

  function handleToggle(id: string) {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function removeNode(nodes: CategoryTreeNodeDto[], id: string): CategoryTreeNodeDto[] {
    return nodes
      .filter((node) => node.id !== id)
      .map((node) => ({
        ...node,
        children: removeNode(node.children, id),
      }));
  }

  function handleDeleted(id: string) {
    setTree((prev) => removeNode(prev, id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // Find shared parent of active and over (sibling reorder only).
    function locate(
      nodes: CategoryTreeNodeDto[],
      parentId: string | null,
    ): { parentId: string | null; siblings: CategoryTreeNodeDto[] } | null {
      const index = nodes.findIndex((node) => node.id === activeId);
      if (index >= 0) {
        const overIndex = nodes.findIndex((node) => node.id === overId);
        if (overIndex >= 0) {
          return { parentId, siblings: nodes };
        }
        return null;
      }
      for (const node of nodes) {
        const found = locate(node.children, node.id);
        if (found) return found;
      }
      return null;
    }

    const located = locate(tree, null);
    if (!located) {
      toast.message("Solo puedes reordenar dentro del mismo nivel.");
      return;
    }

    const oldIndex = located.siblings.findIndex((node) => node.id === activeId);
    const newIndex = located.siblings.findIndex((node) => node.id === overId);
    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;

    const moved = arrayMove(located.siblings, oldIndex, newIndex).map(
      (node, index) => ({
        ...node,
        parentId: located.parentId,
        sortOrder: index,
      }),
    );

    const nextTree = replaceSiblings(tree, located.parentId, moved);
    setTree(nextTree);

    startSave(() => {
      void (async () => {
        const result = await reorderCategoriesAction({
          items: moved.map((node) => ({
            id: node.id,
            parentId: located.parentId,
            sortOrder: node.sortOrder,
          })),
        });
        if (!result.success) {
          toast.error(result.message);
          setTree(cloneTree(initialTree));
          return;
        }
        toast.success("Orden actualizado");
        router.refresh();
      })();
    });
  }

  if (tree.length === 0) {
    return (
      <Empty className="border border-border bg-card">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HiOutlineFolder className="size-5" />
          </EmptyMedia>
          <EmptyTitle>
            {searchActive ? "Sin resultados" : "Sin categorías todavía"}
          </EmptyTitle>
          <EmptyDescription>
            {searchActive
              ? "No hay categorías que coincidan con la búsqueda."
              : "Crea categorías para organizar y filtrar productos del catálogo."}
          </EmptyDescription>
        </EmptyHeader>
        {!searchActive ? (
          <EmptyContent>
            <CreateCategoryDialog parentOptions={parentOptions} />
          </EmptyContent>
        ) : null}
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {searchActive ? (
        <p className="text-sm text-muted-foreground">
          Búsqueda activa: el arrastre queda deshabilitado. Limpia la búsqueda
          para reordenar el árbol.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Arrastra con el asa para reordenar hermanos. El orden se guarda en{" "}
          <code className="text-xs">sortOrder</code>.
        </p>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <TreeBranch
          nodes={tree}
          parentId={null}
          depth={0}
          collapsedIds={collapsedIds}
          onToggle={handleToggle}
          onDeleted={handleDeleted}
          dndEnabled={dndEnabled}
        />
      </DndContext>
    </div>
  );
}
