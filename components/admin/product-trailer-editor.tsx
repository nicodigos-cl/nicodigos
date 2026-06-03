"use client";

import { useState } from "react";
import {
  IconArrowDown,
  IconArrowUp,
  IconBrandYoutube,
  IconExternalLink,
  IconTrash,
} from "@tabler/icons-react";
import type { ProductVideoInput } from "@/lib/admin/products/schemas";
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
import {
  parseYoutubeVideoId,
  youtubeEmbedUrl,
  youtubeWatchUrl,
} from "@/lib/youtube";
import { cn } from "@/lib/utils";

const MAX_TRAILERS = 12;

export type TrailerItem = ProductVideoInput & { clientId: string };

type ProductTrailerEditorProps = {
  trailers: TrailerItem[];
  onChange: (trailers: TrailerItem[]) => void;
  disabled?: boolean;
};

function sortTrailers(trailers: TrailerItem[]): TrailerItem[] {
  return trailers
    .map((trailer, index) => ({ ...trailer, sortOrder: index }))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function mapProductVideosToTrailers(
  videos: {
    id: string;
    youtubeVideoId: string;
    title: string | null;
    sortOrder: number;
  }[],
): TrailerItem[] {
  return videos.map((video) => ({
    clientId: video.id,
    youtubeVideoId: video.youtubeVideoId,
    title: video.title ?? undefined,
    sortOrder: video.sortOrder,
  }));
}

export function ProductTrailerEditor({
  trailers,
  onChange,
  disabled = false,
}: ProductTrailerEditorProps) {
  const [newUrl, setNewUrl] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);

  const sorted = sortTrailers(trailers);
  const primary = sorted[0] ?? null;

  function apply(next: TrailerItem[]) {
    onChange(sortTrailers(next));
  }

  function addTrailer(rawUrl: string, title?: string) {
    const id = parseYoutubeVideoId(rawUrl);
    if (!id) {
      setUrlError("URL o ID de YouTube no válido.");
      return;
    }
    if (trailers.length >= MAX_TRAILERS) {
      setUrlError(`Máximo ${MAX_TRAILERS} trailers.`);
      return;
    }
    if (trailers.some((t) => t.youtubeVideoId === id)) {
      setUrlError("Ese video ya está en la lista.");
      return;
    }

    apply([
      ...trailers,
      {
        clientId: crypto.randomUUID(),
        youtubeVideoId: id,
        title: title?.trim() || undefined,
        sortOrder: trailers.length,
      },
    ]);
    setNewUrl("");
    setNewTitle("");
    setUrlError(null);
  }

  function removeTrailer(clientId: string) {
    apply(trailers.filter((t) => t.clientId !== clientId));
  }

  function moveTrailer(clientId: string, direction: -1 | 1) {
    const index = sorted.findIndex((t) => t.clientId === clientId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= sorted.length) {
      return;
    }
    const next = [...sorted];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item!);
    apply(next);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconBrandYoutube className="size-5 text-red-600" />
          Trailers de YouTube
        </CardTitle>
        <CardDescription>
          Añade enlaces de YouTube (watch, embed o youtu.be). El primero de la
          lista será el trailer principal en la ficha del producto.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {primary ? (
          <div className="overflow-hidden rounded-2xl border border-border bg-black">
            <div className="aspect-video w-full">
              <iframe
                title={primary.title ?? "Trailer principal"}
                src={youtubeEmbedUrl(primary.youtubeVideoId)}
                className="size-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-border/60 bg-muted/40 px-3 py-2">
              <Badge variant="secondary">Principal</Badge>
              {primary.title ? (
                <span className="text-sm font-medium">{primary.title}</span>
              ) : null}
              <Button variant="link" size="sm" className="h-auto px-0" asChild>
                <a
                  href={youtubeWatchUrl(primary.youtubeVideoId)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Abrir en YouTube
                  <IconExternalLink className="size-3.5" />
                </a>
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            <IconBrandYoutube className="size-10 opacity-40" />
            <p>Sin trailers. Pega un enlace de YouTube abajo.</p>
          </div>
        )}

        {sorted.length > 1 ? (
          <ul className="space-y-3">
            {sorted.map((trailer, index) => (
              <li
                key={trailer.clientId}
                className={cn(
                  "flex flex-col gap-3 rounded-xl border border-border p-3 sm:flex-row sm:items-center",
                  index === 0 && "border-primary/40 bg-primary/5",
                )}
              >
                <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-lg bg-black sm:w-40">
                  <iframe
                    title={trailer.title ?? `Trailer ${index + 1}`}
                    src={youtubeEmbedUrl(trailer.youtubeVideoId)}
                    className="size-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate text-sm font-medium">
                    {trailer.title || `Video ${trailer.youtubeVideoId}`}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {youtubeWatchUrl(trailer.youtubeVideoId)}
                  </p>
                  {index === 0 ? (
                    <Badge variant="outline" className="text-xs">
                      Principal
                    </Badge>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-wrap gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="size-8"
                    disabled={disabled || index === 0}
                    onClick={() => moveTrailer(trailer.clientId, -1)}
                  >
                    <IconArrowUp className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="size-8"
                    disabled={disabled || index === sorted.length - 1}
                    onClick={() => moveTrailer(trailer.clientId, 1)}
                  >
                    <IconArrowDown className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="size-8"
                    disabled={disabled}
                    onClick={() => removeTrailer(trailer.clientId)}
                  >
                    <IconTrash className="size-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        <FieldGroup className="rounded-xl border border-dashed border-border p-4">
          <Field>
            <FieldLabel htmlFor="trailer-url">Enlace de YouTube</FieldLabel>
            <Input
              id="trailer-url"
              type="url"
              placeholder="https://www.youtube.com/watch?v=…"
              value={newUrl}
              onChange={(e) => {
                setNewUrl(e.target.value);
                setUrlError(null);
              }}
              disabled={disabled || trailers.length >= MAX_TRAILERS}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="trailer-title">Título (opcional)</FieldLabel>
            <Input
              id="trailer-title"
              placeholder="Trailer oficial"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              disabled={disabled || trailers.length >= MAX_TRAILERS}
            />
          </Field>
          <Button
            type="button"
            variant="secondary"
            disabled={
              disabled || !newUrl.trim() || trailers.length >= MAX_TRAILERS
            }
            onClick={() => addTrailer(newUrl, newTitle)}
          >
            Añadir trailer
          </Button>
          {urlError ? (
            <p className="text-xs text-destructive">{urlError}</p>
          ) : null}
          <FieldDescription>
            Acepta URLs de youtube.com, youtu.be o el ID de 11 caracteres.
          </FieldDescription>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}
