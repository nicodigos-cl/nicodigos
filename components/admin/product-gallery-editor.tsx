"use client";

import { useRef, useState, useTransition } from "react";
import {
  IconArrowDown,
  IconArrowUp,
  IconPhoto,
  IconStar,
  IconStarFilled,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react";
import { uploadProductImageAction } from "@/lib/admin/products/actions";
import type { ProductImageInput } from "@/lib/admin/products/schemas";
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
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const MAX_IMAGES = 24;

export type GalleryImageItem = ProductImageInput & { clientId: string };

type ProductGalleryEditorProps = {
  productId: string;
  productName: string;
  images: GalleryImageItem[];
  onChange: (images: GalleryImageItem[]) => void;
  r2Configured: boolean;
  disabled?: boolean;
};

function sortGallery(images: GalleryImageItem[]): GalleryImageItem[] {
  return images
    .map((image, index) => ({ ...image, sortOrder: index }))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function mapProductImagesToGallery(
  images: {
    id: string;
    url: string;
    thumbnailUrl: string | null;
    sortOrder: number;
    isCover: boolean;
  }[],
): GalleryImageItem[] {
  return images.map((image) => ({
    clientId: image.id,
    url: image.url,
    thumbnailUrl: image.thumbnailUrl ?? undefined,
    sortOrder: image.sortOrder,
    isCover: image.isCover,
  }));
}

export function ProductGalleryEditor({
  productId,
  productName,
  images,
  onChange,
  r2Configured,
  disabled = false,
}: ProductGalleryEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newUrl, setNewUrl] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, startUpload] = useTransition();

  const sorted = sortGallery(images);
  const cover = sorted.find((image) => image.isCover) ?? sorted[0] ?? null;
  const previewSrc = cover?.url ?? null;

  function apply(next: GalleryImageItem[]) {
    onChange(sortGallery(next));
  }

  function addImage(url: string, thumbnailUrl?: string) {
    const trimmed = url.trim();
    if (!trimmed) {
      return;
    }
    if (images.length >= MAX_IMAGES) {
      setUrlError(`Máximo ${MAX_IMAGES} imágenes.`);
      return;
    }
    if (images.some((image) => image.url === trimmed)) {
      setUrlError("Esa URL ya está en la galería.");
      return;
    }

    const isFirst = images.length === 0;
    apply([
      ...images,
      {
        clientId: crypto.randomUUID(),
        url: trimmed,
        thumbnailUrl: thumbnailUrl?.trim() || trimmed,
        sortOrder: images.length,
        isCover: isFirst,
      },
    ]);
    setNewUrl("");
    setUrlError(null);
  }

  function setCover(clientId: string) {
    apply(
      images.map((image) => ({
        ...image,
        isCover: image.clientId === clientId,
      })),
    );
  }

  function removeImage(clientId: string) {
    const remaining = images.filter((image) => image.clientId !== clientId);
    if (remaining.length > 0 && !remaining.some((image) => image.isCover)) {
      remaining[0]!.isCover = true;
    }
    apply(remaining);
  }

  function moveImage(clientId: string, direction: -1 | 1) {
    const index = sorted.findIndex((image) => image.clientId === clientId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= sorted.length) {
      return;
    }
    const next = [...sorted];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item!);
    apply(next);
  }

  function handleAddUrl() {
    try {
      const parsed = new URL(newUrl.trim());
      if (!["http:", "https:"].includes(parsed.protocol)) {
        throw new Error("invalid");
      }
      addImage(parsed.toString());
    } catch {
      setUrlError("Introduce una URL válida (https://…).");
    }
  }

  function handleUpload(file: File) {
    setUploadError(null);
    const formData = new FormData();
    formData.set("file", file);

    startUpload(async () => {
      const result = await uploadProductImageAction(productId, formData);
      if (!result.success) {
        setUploadError(result.error);
        return;
      }
      addImage(result.data.url, result.data.url);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconPhoto className="size-5 text-muted-foreground" />
          Galería de imágenes
        </CardTitle>
        <CardDescription>
          Portada y capturas del producto. La imagen marcada como portada se usa
          en el listado.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div
          className={cn(
            "relative overflow-hidden rounded-2xl border border-border bg-muted/30",
            !previewSrc && "min-h-48",
          )}
        >
          {previewSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewSrc}
              alt={productName}
              className="mx-auto max-h-80 w-full object-contain p-4"
            />
          ) : (
            <div className="flex min-h-48 flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground">
              <IconPhoto className="size-10 opacity-40" />
              <p>Sin imágenes. Añade una URL o sube un archivo.</p>
            </div>
          )}
          {cover ? (
            <Badge className="absolute left-3 top-3 gap-1">
              <IconStarFilled className="size-3" />
              Portada
            </Badge>
          ) : null}
        </div>

        {sorted.length > 0 ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {sorted.map((image, index) => (
              <li
                key={image.clientId}
                className={cn(
                  "group relative overflow-hidden rounded-xl border bg-muted/20",
                  image.isCover && "ring-2 ring-primary ring-offset-2",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.thumbnailUrl ?? image.url}
                  alt=""
                  className="aspect-video w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 flex flex-wrap gap-1 bg-linear-to-t from-black/80 to-transparent p-2 pt-6">
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="size-7"
                    title="Usar como portada"
                    disabled={disabled || image.isCover}
                    onClick={() => setCover(image.clientId)}
                  >
                    {image.isCover ? (
                      <IconStarFilled className="size-3.5" />
                    ) : (
                      <IconStar className="size-3.5" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="size-7"
                    title="Subir orden"
                    disabled={disabled || index === 0}
                    onClick={() => moveImage(image.clientId, -1)}
                  >
                    <IconArrowUp className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="size-7"
                    title="Bajar orden"
                    disabled={disabled || index === sorted.length - 1}
                    onClick={() => moveImage(image.clientId, 1)}
                  >
                    <IconArrowDown className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="size-7"
                    title="Eliminar"
                    disabled={disabled}
                    onClick={() => removeImage(image.clientId)}
                  >
                    <IconTrash className="size-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        <FieldGroup className="rounded-xl border border-dashed border-border p-4">
          <Field>
            <FieldLabel htmlFor="gallery-url">Añadir por URL</FieldLabel>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="gallery-url"
                type="url"
                placeholder="https://…"
                value={newUrl}
                onChange={(e) => {
                  setNewUrl(e.target.value);
                  setUrlError(null);
                }}
                disabled={disabled || images.length >= MAX_IMAGES}
              />
              <Button
                type="button"
                variant="secondary"
                className="shrink-0"
                disabled={
                  disabled || !newUrl.trim() || images.length >= MAX_IMAGES
                }
                onClick={handleAddUrl}
              >
                Añadir
              </Button>
            </div>
            {urlError ? (
              <p className="text-xs text-destructive">{urlError}</p>
            ) : null}
          </Field>

          <Field>
            <FieldLabel>Subir archivo</FieldLabel>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={disabled || !r2Configured || isUploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleUpload(file);
                }
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              disabled={
                disabled ||
                !r2Configured ||
                isUploading ||
                images.length >= MAX_IMAGES
              }
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading ? (
                <Spinner className="size-4" />
              ) : (
                <IconUpload className="size-4" />
              )}
              Subir imagen
            </Button>
            <FieldDescription>
              JPG, PNG o WebP · máx. 5 MB.
              {r2Configured
                ? " Se añade a la galería al subir (guarda el producto para persistir)."
                : " Configura R2 en el servidor para subir archivos."}
            </FieldDescription>
            {uploadError ? (
              <p className="text-xs text-destructive">{uploadError}</p>
            ) : null}
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}
