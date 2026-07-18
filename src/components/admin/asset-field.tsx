"use client";

import { useState } from "react";
import { useDropzone } from "react-dropzone";
import {
  HiOutlineArrowDown,
  HiOutlineArrowUp,
  HiOutlineFilm,
  HiOutlineLink,
  HiOutlinePhotograph,
  HiOutlineStar,
  HiOutlineTrash,
  HiOutlineUpload,
} from "react-icons/hi";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createAssetUploadAction,
  discardAssetUploadAction,
} from "@/lib/actions/assets";
import { cn } from "@/lib/utils";
import { parseYouTubeUrl } from "@/lib/validations/assets";
import { MAX_VIDEO_SIZE, MEDIA_ACCEPT } from "@/lib/uploads/image";
import type { AssetDraft } from "@/types/assets";

type AssetFieldProps = {
  folder: "products" | "categories";
  value: AssetDraft[];
  onChange: (assets: AssetDraft[]) => void;
  disabled?: boolean;
  error?: string;
  allowVideos?: boolean;
};

function normalize(assets: AssetDraft[]): AssetDraft[] {
  const hasCover = assets.some((asset) => asset.type === "IMAGE" && asset.isCover);
  const firstImage = assets.findIndex((asset) => asset.type === "IMAGE");
  return assets.map((asset, index) => ({
    ...asset,
    sortOrder: index,
    isCover:
      asset.type === "IMAGE" &&
      (asset.isCover || (!hasCover && index === firstImage)),
  }));
}

export function AssetField({
  folder,
  value,
  onChange,
  disabled,
  error,
  allowVideos = true,
}: AssetFieldProps) {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [uploading, setUploading] = useState(0);

  async function uploadFile(file: File) {
    const prepared = await createAssetUploadAction({
      contentType: file.type,
      size: file.size,
      folder,
    });
    if (!prepared.success) throw new Error(prepared.message);

    const response = await fetch(prepared.data.uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
      body: file,
    });
    if (!response.ok) throw new Error("R2 rechazó la subida del archivo.");

    return {
      localId: crypto.randomUUID(),
      type: file.type.startsWith("image/") ? "IMAGE" as const : "VIDEO" as const,
      url: prepared.data.url,
      objectKey: prepared.data.key,
      youtubeId: null,
      mimeType: file.type,
      fileName: file.name,
      sizeBytes: file.size,
      thumbnailUrl: null,
      altText: null,
      sortOrder: value.length,
      isCover: false,
    };
  }

  const { getInputProps, getRootProps, isDragActive, fileRejections } = useDropzone({
    accept: allowVideos ? MEDIA_ACCEPT : { ...MEDIA_ACCEPT, "video/mp4": [], "video/webm": [], "video/quicktime": [] },
    multiple: true,
    maxFiles: 12,
    maxSize: MAX_VIDEO_SIZE,
    disabled: disabled || uploading > 0,
    onDropAccepted: (files) => {
      const filtered = allowVideos
        ? files
        : files.filter((file) => file.type.startsWith("image/"));
      if (filtered.length !== files.length) toast.error("Esta sección sólo acepta imágenes.");
      setUploading((current) => current + filtered.length);
      void Promise.allSettled(filtered.map(uploadFile)).then((results) => {
        const uploaded = results.flatMap((result) => {
          if (result.status === "fulfilled") return [result.value];
          toast.error(result.reason instanceof Error ? result.reason.message : "No se pudo subir un archivo.");
          return [];
        });
        onChange(normalize([...value, ...uploaded]));
        setUploading((current) => current - filtered.length);
      });
    },
  });

  function addYouTube() {
    const parsed = parseYouTubeUrl(youtubeUrl);
    if (!parsed) {
      toast.error("Ingresa una URL válida de YouTube.");
      return;
    }
    onChange(normalize([...value, {
      localId: crypto.randomUUID(),
      type: "YOUTUBE",
      url: parsed.url,
      objectKey: null,
      youtubeId: parsed.id,
      mimeType: null,
      fileName: null,
      sizeBytes: null,
      thumbnailUrl: `https://i.ytimg.com/vi/${parsed.id}/hqdefault.jpg`,
      altText: null,
      sortOrder: value.length,
      isCover: false,
    }]));
    setYoutubeUrl("");
  }

  function remove(index: number) {
    const asset = value[index];
    if (asset?.objectKey && !asset.id) void discardAssetUploadAction({ key: asset.objectKey });
    onChange(normalize(value.filter((_, current) => current !== index)));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target]!, next[index]!];
    onChange(normalize(next));
  }

  function setCover(index: number) {
    onChange(value.map((asset, current) => ({
      ...asset,
      isCover: asset.type === "IMAGE" && current === index,
    })));
  }

  return (
    <div className="space-y-5">
      <div
        {...getRootProps()}
        className={cn(
          "flex min-h-40 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-muted/30 p-5 text-center",
          isDragActive && "border-primary bg-primary/5",
          (disabled || uploading > 0) && "cursor-not-allowed opacity-60",
          (error || fileRejections.length > 0) && "border-destructive",
        )}
      >
        <input {...getInputProps()} />
        <HiOutlineUpload className="size-7 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">
            {uploading > 0 ? `Subiendo ${uploading} archivo(s)…` : "Arrastra fotos o videos, o haz clic para elegir"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Imágenes hasta 5 MB · MP4, WebM o MOV hasta 250 MB
          </p>
        </div>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      {allowVideos ? (
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <div className="space-y-2">
            <Label htmlFor={`${folder}-youtube`}>Video de YouTube</Label>
            <Input
              id={`${folder}-youtube`}
              value={youtubeUrl}
              placeholder="https://www.youtube.com/watch?v=..."
              onChange={(event) => setYoutubeUrl(event.target.value)}
            />
          </div>
          <Button type="button" variant="outline" className="self-end" onClick={addYouTube} disabled={disabled || !youtubeUrl.trim()}>
            <HiOutlineLink className="size-4" /> Agregar
          </Button>
        </div>
      ) : null}

      {value.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {value.map((asset, index) => (
            <li key={asset.localId} className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="flex aspect-video items-center justify-center bg-muted">
                {asset.type === "IMAGE" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={asset.url} alt={asset.altText ?? asset.fileName ?? "Imagen"} className="size-full object-cover" />
                ) : asset.type === "YOUTUBE" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={asset.thumbnailUrl ?? ""} alt="Video de YouTube" className="size-full object-cover" />
                ) : (
                  <video src={asset.url} className="size-full object-cover" muted preload="metadata" />
                )}
              </div>
              <div className="flex items-center gap-1 p-2">
                {asset.type === "IMAGE" ? <HiOutlinePhotograph className="size-4" /> : <HiOutlineFilm className="size-4" />}
                <span className="min-w-0 flex-1 truncate text-xs">{asset.fileName ?? (asset.type === "YOUTUBE" ? "YouTube" : asset.type)}</span>
                {asset.type === "IMAGE" ? (
                  <Button type="button" size="icon-sm" variant={asset.isCover ? "default" : "ghost"} onClick={() => setCover(index)} aria-label="Usar como portada">
                    <HiOutlineStar className="size-4" />
                  </Button>
                ) : null}
                <Button type="button" size="icon-sm" variant="ghost" disabled={index === 0} onClick={() => move(index, -1)} aria-label="Mover arriba"><HiOutlineArrowUp className="size-4" /></Button>
                <Button type="button" size="icon-sm" variant="ghost" disabled={index === value.length - 1} onClick={() => move(index, 1)} aria-label="Mover abajo"><HiOutlineArrowDown className="size-4" /></Button>
                <Button type="button" size="icon-sm" variant="ghost" onClick={() => remove(index)} aria-label="Quitar asset"><HiOutlineTrash className="size-4" /></Button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
