"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  HiOutlineArrowDown,
  HiOutlineArrowUp,
  HiOutlinePhotograph,
  HiOutlinePlus,
  HiOutlineStar,
  HiOutlineTrash,
} from "react-icons/hi";
import { toast } from "sonner";

import { ProductThumbnail } from "@/components/admin/products/product-thumbnail";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addProductImageAction,
  removeProductImageAction,
  reorderProductImagesAction,
  setCoverImageAction,
} from "@/lib/actions/products";
import type { ProductDetailDto } from "@/types/products";

type ProductMediaManagerProps = {
  product: ProductDetailDto;
};

export function ProductMediaManager({ product }: ProductMediaManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [url, setUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [setAsCover, setSetAsCover] = useState(true);
  const [coverUrl, setCoverUrl] = useState(product.coverImageUrl ?? "");

  function refresh() {
    router.refresh();
  }

  function handleAddImage(event: React.FormEvent) {
    event.preventDefault();
    startTransition(() => {
      void (async () => {
        const result = await addProductImageAction({
          productId: product.id,
          url,
          thumbnailUrl: thumbnailUrl || null,
          setAsCover,
        });

        if (!result.success) {
          toast.error(result.message);
          return;
        }

        toast.success("Imagen agregada");
        setUrl("");
        setThumbnailUrl("");
        refresh();
      })();
    });
  }

  function handleSetCover(imageId: string) {
    startTransition(() => {
      void (async () => {
        const result = await setCoverImageAction({
          productId: product.id,
          imageId,
        });
        if (!result.success) {
          toast.error(result.message);
          return;
        }
        toast.success("Imagen principal actualizada");
        refresh();
      })();
    });
  }

  function handleRemove(imageId: string) {
    startTransition(() => {
      void (async () => {
        const result = await removeProductImageAction({
          productId: product.id,
          imageId,
        });
        if (!result.success) {
          toast.error(result.message);
          return;
        }
        toast.success("Imagen eliminada");
        refresh();
      })();
    });
  }

  function moveImage(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= product.images.length) {
      return;
    }

    const ids = product.images.map((image) => image.id);
    const [item] = ids.splice(index, 1);
    ids.splice(nextIndex, 0, item);

    startTransition(() => {
      void (async () => {
        const result = await reorderProductImagesAction({
          productId: product.id,
          imageIds: ids,
        });
        if (!result.success) {
          toast.error(result.message);
          return;
        }
        refresh();
      })();
    });
  }

  function handleCoverUrlSave(event: React.FormEvent) {
    event.preventDefault();
    startTransition(() => {
      void (async () => {
        const result = await setCoverImageAction({
          productId: product.id,
          coverImageUrl: coverUrl || null,
        });
        if (!result.success) {
          toast.error(result.message);
          return;
        }
        toast.success("Portada actualizada");
        refresh();
      })();
    });
  }

  return (
    <Card className="shadow-none ring-border">
      <CardHeader>
        <CardTitle>Medios</CardTitle>
        <CardDescription>
          Imagen principal y galería. Agrega URLs (no hay almacenamiento de
          archivos configurado).
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <form onSubmit={handleCoverUrlSave} className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="space-y-2">
            <Label htmlFor="coverImageUrl">Imagen principal (URL)</Label>
            <div className="flex items-center gap-3">
              <ProductThumbnail
                src={product.coverImageUrl}
                alt={product.name}
                size={48}
              />
              <Input
                id="coverImageUrl"
                value={coverUrl}
                placeholder="https://..."
                onChange={(event) => setCoverUrl(event.target.value)}
              />
            </div>
          </div>
          <Button
            type="submit"
            variant="outline"
            disabled={isPending}
            className="self-end"
          >
            Guardar portada
          </Button>
        </form>

        <form onSubmit={handleAddImage} className="grid gap-3 rounded-2xl border border-border p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <HiOutlinePhotograph className="size-4" />
            Agregar imagen por URL
          </div>
          <div className="space-y-2">
            <Label htmlFor="imageUrl">URL de imagen</Label>
            <Input
              id="imageUrl"
              required
              value={url}
              placeholder="https://..."
              onChange={(event) => setUrl(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="thumbnailUrl">URL de miniatura (opcional)</Label>
            <Input
              id="thumbnailUrl"
              value={thumbnailUrl}
              placeholder="https://..."
              onChange={(event) => setThumbnailUrl(event.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={setAsCover}
              onChange={(event) => setSetAsCover(event.target.checked)}
              className="size-4 rounded border-border"
            />
            Usar como imagen principal
          </label>
          <Button type="submit" disabled={isPending || !url.trim()}>
            <HiOutlinePlus className="size-4" />
            Añadir medio
          </Button>
        </form>

        {product.images.length === 0 ? (
          <Empty className="border border-border p-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <HiOutlinePhotograph className="size-5" />
              </EmptyMedia>
              <EmptyTitle>Sin imágenes</EmptyTitle>
              <EmptyDescription>
                Todavía no hay imágenes en la galería.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="flex flex-col gap-3">
            {product.images.map((image, index) => {
              const isCover = product.coverImageUrl === image.url;
              return (
                <li
                  key={image.id}
                  className="flex flex-col gap-3 rounded-2xl border border-border p-3 sm:flex-row sm:items-center"
                >
                  <ProductThumbnail
                    src={image.thumbnailUrl ?? image.url}
                    alt={`Imagen ${index + 1}`}
                    size={56}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{image.url}</p>
                    <p className="text-xs text-muted-foreground">
                      Orden: {image.sortOrder}
                      {isCover ? " · Principal" : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Subir"
                      disabled={isPending || index === 0}
                      onClick={() => moveImage(index, -1)}
                    >
                      <HiOutlineArrowUp className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Bajar"
                      disabled={isPending || index === product.images.length - 1}
                      onClick={() => moveImage(index, 1)}
                    >
                      <HiOutlineArrowDown className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Marcar como principal"
                      disabled={isPending || isCover}
                      onClick={() => handleSetCover(image.id)}
                    >
                      <HiOutlineStar className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Eliminar"
                      disabled={isPending}
                      onClick={() => handleRemove(image.id)}
                    >
                      <HiOutlineTrash className="size-4 text-destructive" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
