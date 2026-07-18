export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
export const MAX_VIDEO_SIZE = 250 * 1024 * 1024;

export const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

export const IMAGE_ACCEPT = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "image/avif": [".avif"],
} as const;

export const VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;

export const MEDIA_ACCEPT = {
  ...IMAGE_ACCEPT,
  "video/mp4": [".mp4"],
  "video/webm": [".webm"],
  "video/quicktime": [".mov"],
} as const;

export function validateImageFile(file: File): string | null {
  if (!IMAGE_MIME_TYPES.includes(file.type as (typeof IMAGE_MIME_TYPES)[number])) {
    return "Usa una imagen JPG, PNG, WebP o AVIF.";
  }

  if (file.size <= 0) {
    return "La imagen está vacía.";
  }

  if (file.size > MAX_IMAGE_SIZE) {
    return "La imagen no puede superar 5 MB.";
  }

  return null;
}

export function validateMediaMetadata(input: {
  type: string;
  size: number;
}): string | null {
  if (IMAGE_MIME_TYPES.includes(input.type as (typeof IMAGE_MIME_TYPES)[number])) {
    if (input.size > MAX_IMAGE_SIZE) return "La imagen no puede superar 5 MB.";
    return input.size > 0 ? null : "El archivo está vacío.";
  }

  if (VIDEO_MIME_TYPES.includes(input.type as (typeof VIDEO_MIME_TYPES)[number])) {
    if (input.size > MAX_VIDEO_SIZE) return "El video no puede superar 250 MB.";
    return input.size > 0 ? null : "El archivo está vacío.";
  }

  return "Usa JPG, PNG, WebP, AVIF, MP4, WebM o MOV.";
}
