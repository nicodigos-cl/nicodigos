"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HiOutlineArrowLeft, HiOutlineSave, HiOutlineTrash } from "react-icons/hi";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { AssetField } from "@/components/admin/asset-field";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  updateCategoryAction,
} from "@/lib/actions/categories";
import { formatDateTime } from "@/lib/format-date";
import { slugify } from "@/lib/products/format";
import type {
  CategoryDetailDto,
  CategoryParentOptionDto,
} from "@/types/categories";
import type { AssetDraft } from "@/types/assets";

type CategoryFormProps = {
  mode: "create" | "edit";
  category?: CategoryDetailDto;
  parentOptions: CategoryParentOptionDto[];
};

type FormState = {
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  parentId: string;
};

function toFormState(category?: CategoryDetailDto): FormState {
  if (!category) {
    return {
      name: "",
      slug: "",
      description: "",
      imageUrl: "",
      parentId: "",
    };
  }

  return {
    name: category.name,
    slug: category.slug,
    description: category.description ?? "",
    imageUrl: category.imageUrl ?? "",
    parentId: category.parentId ?? "",
  };
}

export function CategoryForm({
  mode,
  category,
  parentOptions,
}: CategoryFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [form, setForm] = useState<FormState>(() => toFormState(category));
  const [assets, setAssets] = useState<AssetDraft[]>(() => category?.assets ?? []);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});

    const payload = {
      ...(mode === "edit" && category ? { id: category.id } : {}),
      name: form.name,
      slug: form.slug,
      description: form.description || null,
      imageUrl: null,
      parentId: form.parentId || null,
      assets,
    };

    startTransition(() => {
      void (async () => {
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
        router.push(`/admin/categories/${result.data.id}`);
        router.refresh();
      })();
    });
  }

  const fieldError = (key: string) => fieldErrors[key]?.[0];

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            render={<Link href="/admin/categories" />}
            nativeButton={false}
            aria-label="Volver"
          >
            <HiOutlineArrowLeft className="size-4" />
          </Button>
          <div className="min-w-0 space-y-1">
            <h1 className="truncate font-heading text-2xl font-semibold tracking-tight">
              {mode === "create"
                ? "Nueva categoría"
                : (category?.name ?? "Editar categoría")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {mode === "create"
                ? "Define nombre, slug y jerarquía."
                : `Slug: ${category?.slug}`}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {mode === "edit" && category ? (
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={() => {
                const confirmed = window.confirm(
                  `¿Eliminar "${category.name}"?`,
                );
                if (!confirmed) return;
                startTransition(() => {
                  void (async () => {
                    const result = await deleteCategoryAction({
                      id: category.id,
                    });
                    if (!result.success) {
                      toast.error(result.message);
                      return;
                    }
                    toast.success("Categoría eliminada");
                    router.push("/admin/categories");
                    router.refresh();
                  })();
                });
              }}
            >
              <HiOutlineTrash className="size-4" />
              Eliminar
            </Button>
          ) : null}
          <Button type="submit" disabled={isPending}>
            <HiOutlineSave className="size-4" />
            {isPending ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <div className="flex flex-col gap-6">
          <Card className="shadow-none ring-border">
            <CardHeader>
              <CardTitle>Información general</CardTitle>
              <CardDescription>
                Identidad de la categoría en el catálogo.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={form.name}
                  aria-invalid={Boolean(fieldError("name"))}
                  onChange={(event) => {
                    const name = event.target.value;
                    updateField("name", name);
                    if (!slugTouched) updateField("slug", slugify(name));
                  }}
                />
                {fieldError("name") ? (
                  <p className="text-xs text-destructive">
                    {fieldError("name")}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={form.slug}
                  aria-invalid={Boolean(fieldError("slug"))}
                  onChange={(event) => {
                    setSlugTouched(true);
                    updateField("slug", event.target.value);
                  }}
                />
                {fieldError("slug") ? (
                  <p className="text-xs text-destructive">
                    {fieldError("slug")}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(event) =>
                    updateField("description", event.target.value)
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none ring-border">
            <CardHeader>
              <CardTitle>Medios</CardTitle>
              <CardDescription>
                Agrega fotografías y marca una como portada.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AssetField
                folder="categories"
                value={assets}
                onChange={setAssets}
                disabled={isPending}
                error={fieldError("assets")}
                allowVideos={false}
              />
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card className="shadow-none ring-border">
            <CardHeader>
              <CardTitle>Jerarquía</CardTitle>
              <CardDescription>
                Opcional: anidar bajo otra categoría.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="parentId">Categoría padre</Label>
                <NativeSelect
                  id="parentId"
                  className="w-full"
                  value={form.parentId}
                  aria-invalid={Boolean(fieldError("parentId"))}
                  onChange={(event) =>
                    updateField("parentId", event.target.value)
                  }
                >
                  <NativeSelectOption value="">Sin padre (raíz)</NativeSelectOption>
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

              {category ? (
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    Productos:{" "}
                    <span className="font-medium text-foreground">
                      {category.productsCount}
                    </span>
                  </p>
                  <p>
                    Subcategorías:{" "}
                    <span className="font-medium text-foreground">
                      {category.childrenCount}
                    </span>
                  </p>
                  <p>Actualizada: {formatDateTime(category.updatedAt)}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
