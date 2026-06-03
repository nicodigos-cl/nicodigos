"use client";

import { useMemo, useState } from "react";
import Image from "next/image";

import type { StorefrontProductImage } from "@/lib/store/products/queries";
import { cn } from "@/lib/utils";

type ProductGalleryProps = {
  name: string;
  coverImageUrl: string | null;
  images: StorefrontProductImage[];
  className?: string;
};

function buildGalleryImages(
  coverImageUrl: string | null,
  images: StorefrontProductImage[],
): StorefrontProductImage[] {
  if (images.length > 0) {
    return images;
  }

  if (!coverImageUrl) {
    return [];
  }

  return [
    {
      id: "cover",
      url: coverImageUrl,
      thumbnailUrl: coverImageUrl,
      isCover: true,
    },
  ];
}

export function ProductGallery({
  name,
  coverImageUrl,
  images,
  className,
}: ProductGalleryProps) {
  const galleryImages = useMemo(
    () => buildGalleryImages(coverImageUrl, images),
    [coverImageUrl, images],
  );
  const [selectedId, setSelectedId] = useState(
    () =>
      galleryImages.find((image) => image.isCover)?.id ?? galleryImages[0]?.id,
  );

  const selected =
    galleryImages.find((image) => image.id === selectedId) ?? galleryImages[0];

  if (!selected) {
    return (
      <div
        className={cn(
          "flex aspect-16/10 items-center justify-center rounded-2xl border border-dashed border-border bg-muted/40 text-sm text-muted-foreground",
          className,
        )}
      >
        Sin imagen
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="relative aspect-16/10 overflow-hidden rounded-2xl border border-border/80 bg-muted shadow-sm">
        <Image
          src={selected.url}
          alt={name}
          fill
          unoptimized
          priority
          sizes="(max-width: 1024px) 100vw, 560px"
          className="object-cover"
        />
      </div>

      {galleryImages.length > 1 ? (
        <ul className="flex gap-2 overflow-x-auto pb-1">
          {galleryImages.map((image) => {
            const isSelected = image.id === selected.id;
            const thumb = image.thumbnailUrl ?? image.url;

            return (
              <li key={image.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedId(image.id)}
                  className={cn(
                    "relative size-16 overflow-hidden rounded-xl border bg-muted transition-colors",
                    isSelected
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-border/80 hover:border-primary/40",
                  )}
                  aria-label={`Ver imagen ${image.id}`}
                  aria-pressed={isSelected}
                >
                  <Image
                    src={thumb}
                    alt=""
                    fill
                    unoptimized
                    sizes="64px"
                    className="object-cover"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
