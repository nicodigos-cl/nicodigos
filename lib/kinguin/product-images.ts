import type { KinguinImages, KinguinProduct } from "@/types/kinguin";

function firstNonEmpty(
  ...values: (string | undefined | null)[]
): string | null {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return null;
}

/** Kinguin often returns `cover.url` as "" and the real asset in `cover.thumbnail`. */
export function resolveKinguinCoverUrl(
  images: KinguinImages | undefined | null,
): string | null {
  if (!images) {
    return null;
  }

  const fromCover = firstNonEmpty(images.cover?.thumbnail, images.cover?.url);
  if (fromCover) {
    return fromCover;
  }

  const firstScreenshot = images.screenshots?.[0];
  return firstNonEmpty(firstScreenshot?.thumbnail, firstScreenshot?.url);
}

export function resolveKinguinProductCoverUrl(
  product: Pick<KinguinProduct, "images">,
): string | null {
  return resolveKinguinCoverUrl(product.images);
}

export function hasUsableCoverUrl(url: string | null | undefined): boolean {
  return Boolean(url?.trim());
}

export type KinguinGalleryItem = {
  url: string;
  thumbnailUrl: string | null;
  isCover: boolean;
};

/** Cover + screenshots from Kinguin, deduped by URL. */
export function extractKinguinGallery(
  images: KinguinImages | undefined | null,
): KinguinGalleryItem[] {
  if (!images) {
    return [];
  }

  const items: KinguinGalleryItem[] = [];
  const seen = new Set<string>();

  function push(
    url: string | null,
    thumbnail: string | null,
    isCover: boolean,
  ) {
    if (!url || seen.has(url)) {
      return;
    }
    seen.add(url);
    items.push({
      url,
      thumbnailUrl: thumbnail ?? url,
      isCover,
    });
  }

  const coverUrl = firstNonEmpty(images.cover?.thumbnail, images.cover?.url);
  if (coverUrl) {
    push(
      coverUrl,
      firstNonEmpty(images.cover?.thumbnail, images.cover?.url),
      true,
    );
  }

  for (const shot of images.screenshots ?? []) {
    const url = firstNonEmpty(shot.thumbnail, shot.url);
    const thumb = firstNonEmpty(shot.thumbnail, shot.url);
    if (url) {
      push(url, thumb, false);
    }
  }

  if (items.length > 0 && !items.some((item) => item.isCover)) {
    items[0]!.isCover = true;
  }

  return items;
}

export function extractKinguinProductGallery(
  product: Pick<KinguinProduct, "images">,
): KinguinGalleryItem[] {
  return extractKinguinGallery(product.images);
}
