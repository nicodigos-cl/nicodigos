"use client";

import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { HiOutlinePhotograph, HiOutlineUpload } from "react-icons/hi";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createAssetUploadAction } from "@/lib/actions/assets";
import { bulkUpdateProductCoverAction } from "@/lib/actions/products-bulk";
import { IMAGE_ACCEPT, MAX_IMAGE_SIZE, validateImageFile } from "@/lib/uploads/image";
import { cn } from "@/lib/utils";

type UploadedCover = {
  url: string;
  objectKey: string;
  mimeType: string;
  fileName: string;
  sizeBytes: number;
};

type BulkCoverImageDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productIds: string[];
  onDone: () => void;
};

export function BulkCoverImageDialog({
  open,
  onOpenChange,
  productIds,
  onDone,
}: BulkCoverImageDialogProps) {
  const [cover, setCover] = useState<UploadedCover | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function uploadFile(file: File) {
    const validationError = validateImageFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setUploading(true);
    try {
      const prepared = await createAssetUploadAction({
        contentType: file.type,
        size: file.size,
        folder: "products",
      });
      if (!prepared.success) {
        toast.error(prepared.message);
        return;
      }

      const response = await fetch(prepared.data.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
        body: file,
      });
      if (!response.ok) {
        toast.error("R2 rechazó la subida del archivo.");
        return;
      }

      setCover({
        url: prepared.data.url,
        objectKey: prepared.data.key,
        mimeType: file.type,
        fileName: file.name,
        sizeBytes: file.size,
      });
      toast.success("Imagen lista");
    } finally {
      setUploading(false);
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: IMAGE_ACCEPT,
    multiple: false,
    maxFiles: 1,
    maxSize: MAX_IMAGE_SIZE,
    disabled: uploading || saving,
    onDropAccepted: (files) => {
      const file = files[0];
      if (file) void uploadFile(file);
    },
    onDropRejected: () => {
      toast.error("Usa una imagen JPG, PNG, WebP o AVIF (máx. 5 MB).");
    },
  });

  function handleClose(next: boolean) {
    if (uploading || saving) return;
    if (!next) setCover(null);
    onOpenChange(next);
  }

  function handleApply() {
    if (!cover || productIds.length === 0 || saving) return;
    setSaving(true);
    void (async () => {
      const toastId = toast.loading(
        `Aplicando portada a ${productIds.length} producto${productIds.length === 1 ? "" : "s"}…`,
      );
      try {
        const result = await bulkUpdateProductCoverAction({
          productIds,
          coverImageUrl: cover.url,
          objectKey: cover.objectKey,
          mimeType: cover.mimeType,
          fileName: cover.fileName,
          sizeBytes: cover.sizeBytes,
        });
        if (!result.success) {
          toast.error(result.message, { id: toastId });
          return;
        }
        toast.success(`Portada actualizada en ${result.data.updated} productos`, {
          id: toastId,
        });
        setCover(null);
        onOpenChange(false);
        onDone();
      } finally {
        setSaving(false);
      }
    })();
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cambiar foto</DialogTitle>
          <DialogDescription>
            Sube una imagen y se usará como portada en los{" "}
            {productIds.length} producto
            {productIds.length === 1 ? "" : "s"} seleccionados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div
            {...getRootProps()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center transition-colors",
              isDragActive && "border-primary bg-primary/5",
              (uploading || saving) && "pointer-events-none opacity-60",
            )}
          >
            <input {...getInputProps()} />
            <HiOutlineUpload className="size-6 text-muted-foreground" />
            <p className="text-sm font-medium">
              {uploading
                ? "Subiendo…"
                : "Arrastra una imagen o haz clic para elegir"}
            </p>
            <p className="text-xs text-muted-foreground">
              JPG, PNG, WebP o AVIF · máx. 5 MB
            </p>
          </div>

          {cover ? (
            <div className="flex items-center gap-3 rounded-2xl border border-border p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cover.url}
                alt=""
                className="size-16 rounded-xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{cover.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  Lista para aplicar
                </p>
              </div>
              <HiOutlinePhotograph className="size-5 text-muted-foreground" />
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={uploading || saving}
            onClick={() => handleClose(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={!cover || uploading || saving}
            onClick={handleApply}
          >
            {saving ? "Aplicando…" : "Aplicar portada"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
