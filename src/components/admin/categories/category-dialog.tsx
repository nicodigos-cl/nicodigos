"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HiOutlineSave, HiOutlineTrash } from "react-icons/hi";
import { toast } from "sonner";

import { AssetField } from "@/components/admin/asset-field";
import { confirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import {
  createCategoryAction,
  deleteCategoryAction,
  getCategoryForEditAction,
  updateCategoryAction,
} from "@/lib/actions/categories";
import { slugify } from "@/lib/products/format";
import type {
  CategoryDetailDto,
  CategoryParentOptionDto,
} from "@/types/categories";
import type { AssetDraft } from "@/types/assets";

type CategoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  categoryId?: string | null;
  parentOptions: CategoryParentOptionDto[];
  /** Parent ids that must not be selectable (self + descendants). */
  excludedParentIds?: string[];
};

type FormState = {
  name: string;
  slug: string;
  description: string;
  parentId: string;
};

const emptyForm = (): FormState => ({
  name: "",
  slug: "",
  description: "",
  parentId: "",
});

function toFormState(category: CategoryDetailDto): FormState {
  return {
    name: category.name,
    slug: category.slug,
    description: category.description ?? "",
    parentId: category.parentId ?? "",
  };
}

export function CategoryDialog({
  open,
  onOpenChange,
  mode,
  categoryId = null,
  parentOptions,
  excludedParentIds = [],
}: CategoryDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [form, setForm] = useState<FormState>(emptyForm);
  const [assets, setAssets] = useState<AssetDraft[]>([]);
  const [loadedCategory, setLoadedCategory] = useState<CategoryDetailDto | null>(
    null,
  );

  const excluded = useMemo(
    () => new Set(excludedParentIds),
    [excludedParentIds],
  );
  const selectableParents = useMemo(
    () => parentOptions.filter((option) => !excluded.has(option.id)),
    [parentOptions, excluded],
  );

  useEffect(() => {
    if (!open) return;

    setFieldErrors({});

    if (mode === "create") {
      setForm(emptyForm());
      setAssets([]);
      setLoadedCategory(null);
      setSlugTouched(false);
      setLoading(false);
      return;
    }

    if (!categoryId) return;

    let cancelled = false;
    setLoading(true);
    void (async () => {
      const result = await getCategoryForEditAction({ id: categoryId });
      if (cancelled) return;
      if (!result.success) {
        toast.error(result.message);
        onOpenChange(false);
        setLoading(false);
        return;
      }
      setLoadedCategory(result.data);
      setForm(toFormState(result.data));
      setAssets(result.data.assets);
      setSlugTouched(true);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [open, mode, categoryId, onOpenChange]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setFieldErrors({});

    startTransition(() => {
      void (async () => {
        const payload = {
          ...(mode === "edit" && categoryId ? { id: categoryId } : {}),
          name: form.name,
          slug: form.slug,
          description: form.description || null,
          imageUrl: null,
          parentId: form.parentId || null,
          assets,
        };

        const result =
          mode === "create"
            ? await createCategoryAction(payload)
            : await updateCategoryAction(payload);

        if (!result.success) {
          setFieldErrors(result.fieldErrors ?? {});
          toast.error(result.message);
          return;
        }

        toast.success(
          mode === "create" ? "Categoría creada" : "Cambios guardados",
        );
        onOpenChange(false);
        router.refresh();
      })();
    });
  }

  function handleDelete() {
    if (!categoryId || !loadedCategory) return;
    void (async () => {
      const confirmed = await confirmDialog.danger({
        title: "Eliminar categoría",
        description: `¿Eliminar “${loadedCategory.name}”?`,
        confirmLabel: "Eliminar",
      });
      if (!confirmed) return;

      startTransition(() => {
        void (async () => {
          const result = await deleteCategoryAction({ id: categoryId });
          if (!result.success) {
            toast.error(result.message);
            return;
          }
          toast.success("Categoría eliminada");
          onOpenChange(false);
          router.refresh();
        })();
      });
    })();
  }

  const fieldError = (key: string) => fieldErrors[key]?.[0];
  const busy = isPending || loading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={handleSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>
              {mode === "create" ? "Nueva categoría" : "Editar categoría"}
            </DialogTitle>
            <DialogDescription>
              {mode === "create"
                ? "Define nombre, slug, jerarquía y una imagen de portada."
                : loadedCategory
                  ? `/${loadedCategory.slug}`
                  : "Cargando…"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="space-y-2">
              <Label htmlFor="category-dialog-name">Nombre</Label>
              <Input
                id="category-dialog-name"
                value={form.name}
                disabled={busy || undefined}
                aria-invalid={Boolean(fieldError("name"))}
                onChange={(event) => {
                  const name = event.target.value;
                  updateField("name", name);
                  if (!slugTouched) updateField("slug", slugify(name));
                }}
              />
              {fieldError("name") ? (
                <p className="text-xs text-destructive">{fieldError("name")}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category-dialog-slug">Slug</Label>
              <Input
                id="category-dialog-slug"
                value={form.slug}
                disabled={busy || undefined}
                aria-invalid={Boolean(fieldError("slug"))}
                onChange={(event) => {
                  setSlugTouched(true);
                  updateField("slug", event.target.value);
                }}
              />
              {fieldError("slug") ? (
                <p className="text-xs text-destructive">{fieldError("slug")}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category-dialog-description">Descripción</Label>
              <Textarea
                id="category-dialog-description"
                value={form.description}
                disabled={busy || undefined}
                onChange={(event) =>
                  updateField("description", event.target.value)
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category-dialog-parent">Categoría padre</Label>
              <NativeSelect
                id="category-dialog-parent"
                className="w-full"
                value={form.parentId}
                disabled={busy || undefined}
                aria-invalid={Boolean(fieldError("parentId"))}
                onChange={(event) =>
                  updateField("parentId", event.target.value)
                }
              >
                <NativeSelectOption value="">
                  Sin padre (raíz)
                </NativeSelectOption>
                {selectableParents.map((option) => (
                  <NativeSelectOption key={option.id} value={option.id}>
                    {option.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              {fieldError("parentId") ? (
                <p className="text-xs text-destructive">
                  {fieldError("parentId")}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>Medios</Label>
              <AssetField
                folder="categories"
                value={assets}
                onChange={setAssets}
                disabled={busy}
                error={fieldError("assets")}
                allowVideos={false}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            {mode === "edit" ? (
              <Button
                type="button"
                variant="destructive"
                disabled={busy || undefined}
                onClick={handleDelete}
              >
                <HiOutlineTrash className="size-4" />
                Eliminar
              </Button>
            ) : (
              <span />
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={busy || undefined}
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={busy || undefined}>
                <HiOutlineSave className="size-4" />
                {isPending
                  ? "Guardando…"
                  : mode === "create"
                    ? "Crear categoría"
                    : "Guardar cambios"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
