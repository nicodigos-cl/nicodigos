"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, useTransition } from "react";
import { CategoryMediaField } from "@/components/admin/category-media-field";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { upsertCategoryAction } from "@/lib/admin/categories/actions";
import type { AdminCategoryEditData } from "@/lib/admin/categories/types";
import type { UpsertCategoryInput } from "@/lib/admin/categories/schemas";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  normalizeDescriptionForEditor,
  normalizeDescriptionForSave,
} from "@/lib/html/text";

type CategoryEditFormProps = {
  category?: AdminCategoryEditData;
  r2Configured: boolean;
};

function buildInitialForm(
  category?: AdminCategoryEditData,
): Omit<UpsertCategoryInput, "id"> & { id?: string } {
  if (!category) {
    return {
      name: "",
      description: undefined,
      imageUrl: undefined,
      bannerUrl: undefined,
      sortOrder: 0,
    };
  }

  return {
    id: category.id,
    name: category.name,
    description: category.description ?? undefined,
    imageUrl: category.imageUrl ?? undefined,
    bannerUrl: category.bannerUrl ?? undefined,
    sortOrder: category.sortOrder,
  };
}

export function CategoryEditForm({
  category,
  r2Configured,
}: CategoryEditFormProps) {
  const router = useRouter();
  const isNew = !category;
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [draftSlug, setDraftSlug] = useState<string | null>(
    category?.slug ?? null,
  );

  const [form, setForm] = useState(() => {
    const initial = buildInitialForm(category);
    return {
      id: initial.id,
      name: initial.name,
      description: normalizeDescriptionForEditor(category?.description),
      imageUrl: category?.imageUrl ?? "",
      bannerUrl: category?.bannerUrl ?? "",
      sortOrder: initial.sortOrder,
    };
  });

  const categoryId = form.id ?? category?.id;
  const displaySlug = draftSlug ?? category?.slug ?? null;
  const ensureCategoryIdPromiseRef = useRef<Promise<string | null> | null>(
    null,
  );

  function buildPayload(): UpsertCategoryInput {
    return {
      id: form.id,
      name: form.name.trim(),
      description: normalizeDescriptionForSave(form.description),
      imageUrl: form.imageUrl.trim() || undefined,
      bannerUrl: form.bannerUrl.trim() || undefined,
      sortOrder: form.sortOrder,
    };
  }

  const ensureCategoryId = useCallback(async (): Promise<string | null> => {
    if (form.id) {
      return form.id;
    }

    if (ensureCategoryIdPromiseRef.current) {
      return ensureCategoryIdPromiseRef.current;
    }

    const createDraft = (async (): Promise<string | null> => {
      const name = form.name.trim();
      if (!name) {
        setError("Escribe un nombre antes de subir imágenes.");
        return null;
      }

      setError(null);
      const result = await upsertCategoryAction(buildPayload());
      if (!result.success) {
        setError(result.error);
        return null;
      }

      setForm((prev) => ({ ...prev, id: result.id }));
      if (result.slug) {
        setDraftSlug(result.slug);
      }
      setMessage("Borrador guardado. Puedes seguir subiendo imágenes.");
      return result.id;
    })();

    ensureCategoryIdPromiseRef.current = createDraft;

    try {
      return await createDraft;
    } finally {
      ensureCategoryIdPromiseRef.current = null;
    }
  }, [
    form.id,
    form.name,
    form.description,
    form.imageUrl,
    form.bannerUrl,
    form.sortOrder,
  ]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = await upsertCategoryAction(buildPayload());

      if (!result.success) {
        setError(result.error);
        return;
      }

      if (result.slug) {
        setDraftSlug(result.slug);
      }

      if (isNew && !form.id) {
        router.push(`/admin/categories/${result.id}/edit?created=1`);
        return;
      }

      if (isNew) {
        router.push("/admin/categories");
        return;
      }

      setMessage(result.message ?? "Guardado.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Información general</CardTitle>
          <CardDescription>
            Nombre y descripción visibles en la tienda. El slug se genera
            automáticamente al guardar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="cat-name">Nombre</FieldLabel>
              <Input
                id="cat-name"
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                disabled={isPending}
                required
              />
            </Field>
            {displaySlug ? (
              <Field>
                <FieldLabel>Slug</FieldLabel>
                <FieldDescription className="font-mono text-xs">
                  {displaySlug}
                </FieldDescription>
              </Field>
            ) : null}
            <Field>
              <FieldLabel htmlFor="cat-desc">Descripción</FieldLabel>
              <FieldDescription>
                Editor rich text para la ficha de la categoría en la tienda.
              </FieldDescription>
              <RichTextEditor
                id="cat-desc"
                value={form.description}
                onChange={(description) =>
                  setForm((prev) => ({ ...prev, description }))
                }
                placeholder="Describe la categoría para tus clientes…"
                disabled={isPending}
                minHeight="10rem"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="cat-order">Orden</FieldLabel>
              <Input
                id="cat-order"
                type="number"
                min={0}
                value={form.sortOrder}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    sortOrder: Number(e.target.value),
                  }))
                }
                disabled={isPending}
                className="max-w-xs"
              />
              <FieldDescription>
                Menor número = aparece antes en listados.
              </FieldDescription>
            </Field>
            {category ? (
              <Field>
                <FieldLabel>Productos en esta categoría</FieldLabel>
                <FieldDescription>{category.productCount}</FieldDescription>
              </Field>
            ) : null}
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Imagen y banner</CardTitle>
          <CardDescription>
            Icono para menús y tarjetas; banner ancho para la cabecera. Puedes
            subir a R2 con el nombre ya definido o pegar una URL.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <CategoryMediaField
            label="Imagen / icono"
            description="Cuadrada, recomendado 256×256 px o más."
            kind="image"
            categoryId={categoryId}
            value={form.imageUrl}
            onChange={(imageUrl) => setForm((prev) => ({ ...prev, imageUrl }))}
            onEnsureCategoryId={isNew ? ensureCategoryId : undefined}
            r2Configured={r2Configured}
            disabled={isPending}
            aspectClassName="aspect-square max-h-52"
          />
          <CategoryMediaField
            label="Banner"
            description="Ancho, recomendado 1200×400 px o similar."
            kind="banner"
            categoryId={categoryId}
            value={form.bannerUrl}
            onChange={(bannerUrl) =>
              setForm((prev) => ({ ...prev, bannerUrl }))
            }
            onEnsureCategoryId={isNew ? ensureCategoryId : undefined}
            r2Configured={r2Configured}
            disabled={isPending}
            aspectClassName="aspect-[21/9] max-h-52"
          />
        </CardContent>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {message ? (
        <Alert>
          <AlertTitle>Listo</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? <Spinner className="size-4" /> : null}
          {isNew && !form.id ? "Crear categoría" : "Guardar cambios"}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/admin/categories">Volver al listado</Link>
        </Button>
      </div>
    </form>
  );
}
