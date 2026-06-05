"use client";

import { useRef, useState, useTransition } from "react";
import { IconPhoto, IconTrash, IconUpload } from "@tabler/icons-react";
import { uploadCategoryImageAction } from "@/lib/admin/categories/actions";
import type { CategoryImageKind } from "@/lib/r2/upload-category-image";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

type CategoryMediaFieldProps = {
  label: string;
  description: string;
  kind: CategoryImageKind;
  categoryId: string | undefined;
  value: string;
  onChange: (url: string) => void;
  onEnsureCategoryId?: () => Promise<string | null>;
  r2Configured: boolean;
  disabled?: boolean;
  aspectClassName?: string;
};

export function CategoryMediaField({
  label,
  description,
  kind,
  categoryId,
  value,
  onChange,
  onEnsureCategoryId,
  r2Configured,
  disabled = false,
  aspectClassName = "aspect-video",
}: CategoryMediaFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, startUpload] = useTransition();

  const canUpload =
    r2Configured && !disabled && Boolean(categoryId || onEnsureCategoryId);
  const preview = value.trim() || null;

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    setUploadError(null);

    startUpload(async () => {
      let targetId: string | undefined = categoryId;
      if (!targetId && onEnsureCategoryId) {
        const ensured = await onEnsureCategoryId();
        if (!ensured) {
          return;
        }
        targetId = ensured;
      }
      if (!targetId) {
        return;
      }

      const formData = new FormData();
      formData.set("file", file);

      const result = await uploadCategoryImageAction(targetId, kind, formData);
      if (!result.success) {
        setUploadError(result.error);
        return;
      }
      if (result.url) {
        onChange(result.url);
      }
    });
  }

  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <FieldDescription>{description}</FieldDescription>

      <div
        className={cn(
          "relative overflow-hidden rounded-xl border border-border bg-muted/30",
          aspectClassName,
        )}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full min-h-[120px] flex-col items-center justify-center gap-2 text-muted-foreground">
            <IconPhoto className="size-8 opacity-50" />
            <span className="text-xs">Sin imagen</span>
          </div>
        )}
      </div>

      <Input
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || isUploading}
        placeholder="https://…"
        className="mt-2"
      />

      <div className="mt-2 flex flex-wrap gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          disabled={!canUpload || isUploading}
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canUpload || isUploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {isUploading ? (
            <Spinner className="size-4" />
          ) : (
            <IconUpload className="size-4" />
          )}
          Subir a R2
        </Button>
        {preview ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || isUploading}
            onClick={() => onChange("")}
          >
            <IconTrash className="size-4" />
            Quitar
          </Button>
        ) : null}
      </div>

      {!categoryId && onEnsureCategoryId ? (
        <p className="text-xs text-muted-foreground">
          Escribe un nombre y usa «Subir a R2» (se guarda un borrador automático).
        </p>
      ) : !categoryId ? (
        <p className="text-xs text-muted-foreground">
          Guarda la categoría para habilitar la subida a R2.
        </p>
      ) : !r2Configured ? (
        <p className="text-xs text-muted-foreground">
          R2 no configurado: usa una URL externa.
        </p>
      ) : null}

      {uploadError ? (
        <Alert variant="destructive" className="mt-2">
          <AlertDescription>{uploadError}</AlertDescription>
        </Alert>
      ) : null}
    </Field>
  );
}
