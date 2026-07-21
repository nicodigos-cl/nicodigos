"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HiOutlinePlus, HiOutlineSave } from "react-icons/hi";
import { toast } from "sonner";

import { AssetField } from "@/components/admin/asset-field";
import { Button } from "@/components/ui/button";
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
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { createCategoryAction } from "@/lib/actions/categories";
import { slugify } from "@/lib/products/format";
import type { CategoryParentOptionDto } from "@/types/categories";
import type { AssetDraft } from "@/types/assets";

type CreateCategoryDialogProps = {
  parentOptions: CategoryParentOptionDto[];
  defaultParentId?: string | null;
};

type FormState = {
  name: string;
  slug: string;
  description: string;
  parentId: string;
};

const emptyForm = (parentId = ""): FormState => ({
  name: "",
  slug: "",
  description: "",
  parentId,
});

export function CreateCategoryDialog({
  parentOptions,
  defaultParentId = null,
}: CreateCategoryDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [slugTouched, setSlugTouched] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [form, setForm] = useState<FormState>(() =>
    emptyForm(defaultParentId ?? ""),
  );
  const [assets, setAssets] = useState<AssetDraft[]>([]);

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm(defaultParentId ?? ""));
    setAssets([]);
    setSlugTouched(false);
    setFieldErrors({});
  }, [open, defaultParentId]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});

    startTransition(() => {
      void (async () => {
        const result = await createCategoryAction({
          name: form.name,
          slug: form.slug,
          description: form.description || null,
          imageUrl: null,
          parentId: form.parentId || null,
          assets,
        });

        if (!result.success) {
          setFieldErrors(result.fieldErrors ?? {});
          toast.error(result.message);
          return;
        }

        toast.success("Categoría creada");
        setOpen(false);
        router.refresh();
      })();
    });
  }

  const fieldError = (key: string) => fieldErrors[key]?.[0];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" className="shrink-0" />}>
        <HiOutlinePlus className="size-4" />
        Añadir categoría
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={handleSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Nueva categoría</DialogTitle>
            <DialogDescription>
              Define nombre, slug, jerarquía y una imagen de portada.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="space-y-2">
              <Label htmlFor="create-category-name">Nombre</Label>
              <Input
                id="create-category-name"
                value={form.name}
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
              <Label htmlFor="create-category-slug">Slug</Label>
              <Input
                id="create-category-slug"
                value={form.slug}
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
              <Label htmlFor="create-category-description">Descripción</Label>
              <Textarea
                id="create-category-description"
                value={form.description}
                onChange={(event) =>
                  updateField("description", event.target.value)
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-category-parent">Categoría padre</Label>
              <NativeSelect
                id="create-category-parent"
                className="w-full"
                value={form.parentId}
                aria-invalid={Boolean(fieldError("parentId"))}
                onChange={(event) =>
                  updateField("parentId", event.target.value)
                }
              >
                <NativeSelectOption value="">
                  Sin padre (raíz)
                </NativeSelectOption>
                {parentOptions.map((option) => (
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
                disabled={isPending}
                error={fieldError("assets")}
                allowVideos={false}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending || undefined}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending || undefined}>
              <HiOutlineSave className="size-4" />
              {isPending ? "Creando..." : "Crear categoría"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
