"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { HiPlay } from "react-icons/hi2";

import { cn } from "@/lib/utils";
import type { StoreProductImageDto } from "@/types/products";

type StoreProductGalleryProps = {
  images: StoreProductImageDto[];
  className?: string;
};

function getYouTubeEmbedUrl(url: string) {
  let videoId = "";
  if (url.includes("youtube.com/watch")) {
    try {
      videoId = new URL(url).searchParams.get("v") || "";
    } catch {
      // fallback
    }
  } else if (url.includes("youtu.be/")) {
    videoId = url.split("youtu.be/")[1]?.split("?")[0] || "";
  } else if (url.includes("youtube.com/embed/")) {
    videoId = url.split("youtube.com/embed/")[1]?.split("?")[0] || "";
  }
  return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}` : url;
}

export function StoreProductGallery({
  images,
  className,
}: StoreProductGalleryProps) {
  const [activeId, setActiveId] = useState<string | null>(images[0]?.id || null);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    if (images.length > 0) {
      setActiveId(images[0].id);
    } else {
      setActiveId(null);
    }
  }, [images]);

  if (images.length === 0) {
    return (
      <div
        className={cn(
          "aspect-square w-full rounded-2xl bg-muted ring-1 ring-border/50",
          className,
        )}
        aria-hidden
      />
    );
  }

  const activeAsset = images.find((img) => img.id === activeId) || images[0];

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomPos({ x, y });
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-border/50 bg-muted/20">
        {activeAsset.type === "VIDEO" ? (
          <video
            src={activeAsset.src}
            className="size-full object-contain"
            controls
            autoPlay
            muted
            loop
            playsInline
          />
        ) : activeAsset.type === "YOUTUBE" ? (
          <iframe
            src={getYouTubeEmbedUrl(activeAsset.src)}
            className="size-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div
            className="relative size-full overflow-hidden cursor-zoom-in"
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsZoomed(true)}
            onMouseLeave={() => {
              setIsZoomed(false);
              setZoomPos({ x: 50, y: 50 });
            }}
          >
            <Image
              alt={activeAsset.alt}
              src={activeAsset.src}
              fill
              priority
              unoptimized
              sizes="(max-width: 1024px) 100vw, 50vw"
              style={{
                transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                transform: isZoomed ? "scale(2.2)" : "scale(1)",
              }}
              className="object-cover transition-transform duration-150 ease-out"
            />
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 ? (
        <div className="w-full">
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
            {images.map((image) => {
              const isVideo = image.type === "VIDEO" || image.type === "YOUTUBE";
              const isActive = image.id === activeId;
              return (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => setActiveId(image.id)}
                  className={cn(
                    "relative size-16 shrink-0 overflow-hidden rounded-lg border bg-muted transition-colors sm:size-20",
                    isActive
                      ? "border-foreground/40 ring-1 ring-foreground/20"
                      : "border-border/60 hover:border-border",
                  )}
                >
                  <span className="sr-only">{image.name}</span>
                  {image.thumbnailUrl || isVideo ? (
                    <Image
                      alt=""
                      src={image.thumbnailUrl || image.src}
                      fill
                      unoptimized
                      sizes="80px"
                      className={cn(
                        "object-cover transition-opacity duration-300",
                        isVideo && "opacity-80 group-hover:opacity-100",
                      )}
                    />
                  ) : (
                    <Image
                      alt=""
                      src={image.src}
                      fill
                      unoptimized
                      sizes="80px"
                      className="object-cover"
                    />
                  )}

                  {/* Play icon overlay for videos */}
                  {isVideo && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors group-hover:bg-black/20">
                      <HiPlay className="size-8 text-white drop-shadow-md" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
